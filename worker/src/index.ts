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
    ctx.waitUntil(promotePendingCases(env.DB));
  },
};
