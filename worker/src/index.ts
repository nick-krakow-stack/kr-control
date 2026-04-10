import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env, User } from "./types";
import { hashPassword } from "./auth";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import locationRoutes from "./routes/locations";
import caseRoutes from "./routes/cases";
import statsRoutes from "./routes/stats";
import settingsRoutes from "./routes/settings";
import caseEventRoutes from "./routes/case-events";
import { shiftsRouter } from "./routes/shifts";
import { customersRouter } from "./routes/customers";
import { whitelistRouter } from "./routes/whitelist";
import { workTimesRouter } from "./routes/work-times";
import violationsRouter from "./routes/violations";
import caseFeesRouter from "./routes/case-fees";
import vehicleTypesRouter from "./routes/vehicle-types";

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// CORS
app.use("*", cors({
  origin: (origin) => {
    const allowed = [
      "https://kr-control.pages.dev",
      "https://nick-krakow-stack.github.io",
      "http://localhost:8787",
    ];
    return allowed.includes(origin) || origin.endsWith(".kr-control.pages.dev") ? origin : allowed[0];
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Uploads: serve images from R2 (public, no auth needed for direct image URLs)
app.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  const object = await c.env.UPLOADS.get(filename);
  if (!object) return c.json({ detail: "Nicht gefunden" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000");
  return new Response(object.body, { headers });
});

// API Routes
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/locations", locationRoutes);
app.route("/api/cases", caseRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/case-events", caseEventRoutes);
app.route("/api/shifts", shiftsRouter);
app.route("/api/customers", customersRouter);
app.route("/api/whitelist", whitelistRouter);
app.route("/api/work-times", workTimesRouter);
app.route("/api/violations", violationsRouter);
app.route("/api/case-fees", caseFeesRouter);
app.route("/api/vehicle-types", vehicleTypesRouter);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", service: "KR Control API", version: "3.0.0" }));

// 404 fallback
app.notFound((c) => c.json({ detail: "Nicht gefunden" }, 404));

// ── Scheduled: promote pending → new after recall deadline ──────────
async function promotePendingCases(db: D1Database) {
  const now = new Date().toISOString();
  const result = await db.prepare(
    "UPDATE cases SET status = 'new' WHERE status = 'pending' AND recall_deadline <= ?"
  ).bind(now).run();
  if (result.meta.changes > 0) {
    console.log(`Scheduler: ${result.meta.changes} Fälle von 'pending' auf 'new' gesetzt`);
  }
}

// ── Anonymisierung: DSGVO-Fristen ────────────────────────────────────
async function deleteImagesForCase(db: D1Database, uploads: R2Bucket, caseId: number) {
  const images = await db.prepare("SELECT filename FROM case_images WHERE case_id = ?")
    .bind(caseId).all<{ filename: string }>();
  await Promise.all(images.results.map((img) => uploads.delete(img.filename)));
  await db.prepare("DELETE FROM case_images WHERE case_id = ?").bind(caseId).run();
}

async function anonymizeCases(db: D1Database, uploads: R2Bucket) {
  const settingsRows = await db.prepare(
    "SELECT key, value FROM settings WHERE key IN ('anon_days_new', 'anon_days_closed', 'anon_days_paid')"
  ).all<{ key: string; value: string }>();
  const sm = Object.fromEntries(settingsRows.results.map((r) => [r.key, Number(r.value)]));
  const daysNew = sm["anon_days_new"] || 30;
  const daysClosed = sm["anon_days_closed"] || 7;
  const daysPaid = sm["anon_days_paid"] || 30;

  const now = new Date();
  const nowIso = now.toISOString();
  const cutoff30 = new Date(now.getTime() - daysNew * 24 * 60 * 60 * 1000).toISOString();
  const cutoff7 = new Date(now.getTime() - daysClosed * 24 * 60 * 60 * 1000).toISOString();
  const cutoffPaid = new Date(now.getTime() - daysPaid * 24 * 60 * 60 * 1000).toISOString();

  // 1. Status 'new' seit 30+ Tagen → geschlossen (abandoned) + sofort anonymisieren
  const abandoned = await db.prepare(
    "SELECT id FROM cases WHERE status = 'new' AND created_at <= ? AND anonymized_at IS NULL"
  ).bind(cutoff30).all<{ id: number }>();
  for (const row of abandoned.results) {
    await db.prepare(
      `UPDATE cases SET status='closed', closed_reason='abandoned', closed_at=?,
       license_plate='XX XX 111', owner_first_name='Falsch', owner_last_name='Parker',
       owner_street=NULL, owner_zip=NULL, anonymized_at=? WHERE id=?`
    ).bind(nowIso, nowIso, row.id).run();
    await deleteImagesForCase(db, uploads, row.id);
  }

  // 2. Status 'closed' (manuell) seit 7+ Tagen → anonymisieren
  const manualClosed = await db.prepare(
    "SELECT id FROM cases WHERE status = 'closed' AND closed_reason = 'manual' AND closed_at <= ? AND anonymized_at IS NULL"
  ).bind(cutoff7).all<{ id: number }>();
  for (const row of manualClosed.results) {
    await db.prepare(
      `UPDATE cases SET license_plate='XX XX 111', owner_first_name='Falsch', owner_last_name='Parker',
       owner_street=NULL, owner_zip=NULL, anonymized_at=? WHERE id=?`
    ).bind(nowIso, row.id).run();
    await deleteImagesForCase(db, uploads, row.id);
  }

  // 3. Status 'paid' seit X Tagen → anonymisieren
  const paid = await db.prepare(
    "SELECT id FROM cases WHERE status = 'paid' AND paid_at <= ? AND anonymized_at IS NULL"
  ).bind(cutoffPaid).all<{ id: number }>();
  for (const row of paid.results) {
    await db.prepare(
      `UPDATE cases SET license_plate='XX XX 111', owner_first_name='Falsch', owner_last_name='Parker',
       owner_street=NULL, owner_zip=NULL, anonymized_at=? WHERE id=?`
    ).bind(nowIso, row.id).run();
    await deleteImagesForCase(db, uploads, row.id);
  }

  const total = abandoned.results.length + manualClosed.results.length + paid.results.length;
  if (total > 0) console.log(`Anonymisierung: ${total} Fälle anonymisiert`);
}

// ── Seed admin on first run ──────────────────────────────────────────
async function seedAdmin(env: Env) {
  const count = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>();
  if (!count || count.c > 0) return;

  const hashed = await hashPassword(env.FIRST_ADMIN_PASSWORD || "ChangeMe123!");
  await env.DB.prepare(
    `INSERT INTO users (username, email, hashed_password, role, is_active, email_verified)
     VALUES (?, ?, ?, 'admin', 1, 1)`
  ).bind(
    env.FIRST_ADMIN_USERNAME || "admin",
    env.FIRST_ADMIN_EMAIL || "admin@kr-control.de",
    hashed
  ).run();
  console.log("Admin-User angelegt");
}

let adminSeeded = false;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Seed admin once per worker instance (idempotent DB check inside)
    if (!adminSeeded) {
      adminSeeded = true;
      ctx.waitUntil(seedAdmin(env));
    }
    return app.fetch(request, env, ctx);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([
      promotePendingCases(env.DB),
      anonymizeCases(env.DB, env.UPLOADS),
    ]));
  },
};
