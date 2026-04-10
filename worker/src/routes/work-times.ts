import { Hono } from "hono";
import { Env, User } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";

export const workTimesRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

workTimesRouter.use("*", authMiddleware);

async function getAdminEmail(db: D1Database): Promise<string | null> {
  const admin = await db.prepare(
    "SELECT email FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id ASC LIMIT 1"
  ).first<{ email: string }>();
  return admin?.email ?? null;
}

async function sendNotification(
  env: Env,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  if (!env.RESEND_API_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${env.SMTP_FROM_NAME} <${env.SMTP_FROM}>`,
        to: [to],
        subject,
        html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${body}</pre>`,
      }),
    });
  } catch {
    // Email errors should not block the response
  }
}

// GET / — requireAuth — mitarbeiter sees own, admin sees all
workTimesRouter.get("/", async (c) => {
  const user = c.get("user");

  let rows;
  if (user.role === "admin") {
    rows = await c.env.DB.prepare(
      `SELECT w.*, u.username FROM work_time_requests w
       JOIN users u ON w.user_id = u.id
       ORDER BY w.created_at DESC`
    ).all();
  } else {
    rows = await c.env.DB.prepare(
      `SELECT w.*, u.username FROM work_time_requests w
       JOIN users u ON w.user_id = u.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`
    ).bind(user.id).all();
  }

  return c.json(rows.results);
});

// POST / — requireAuth, staff only (mitarbeiter or admin)
workTimesRouter.post("/", async (c) => {
  const user = c.get("user");

  if (!["admin", "mitarbeiter"].includes(user.role)) {
    return c.json({ detail: "Nur Mitarbeiter und Admins können Arbeitszeitanfragen stellen" }, 403);
  }

  const data = await c.req.json<{ started_at: string; ended_at: string; note?: string }>();
  const { started_at, ended_at, note } = data;

  if (!started_at || !ended_at) {
    return c.json({ detail: "started_at und ended_at sind Pflichtfelder" }, 400);
  }
  if (new Date(started_at) >= new Date(ended_at)) {
    return c.json({ detail: "started_at muss vor ended_at liegen" }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO work_time_requests (user_id, started_at, ended_at, note, status)
     VALUES (?, ?, ?, ?, 'pending')`
  ).bind(user.id, started_at, ended_at, note ?? null).run();

  const created = await c.env.DB.prepare(
    `SELECT w.*, u.username FROM work_time_requests w
     JOIN users u ON w.user_id = u.id
     WHERE w.id = ?`
  ).bind(result.meta.last_row_id).first();

  // Send email notification to first admin
  c.executionCtx.waitUntil((async () => {
    try {
      const adminEmail = await getAdminEmail(c.env.DB);
      if (adminEmail) {
        await sendNotification(
          c.env,
          adminEmail,
          `Neue Arbeitszeitanfrage von ${user.username}`,
          `Mitarbeiter ${user.username} hat eine Arbeitszeitanfrage eingereicht:\nVon: ${started_at}\nBis: ${ended_at}\nNotiz: ${note ?? "keine"}\n\nBitte im Admin-Bereich bestätigen oder ablehnen.`
        );
      }
    } catch {
      // ignore
    }
  })());

  return c.json(created, 201);
});

// PATCH /:id — requireAdmin
workTimesRouter.patch("/:id", requireAdmin, async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));

  const existing = await c.env.DB.prepare(
    "SELECT * FROM work_time_requests WHERE id = ?"
  ).bind(id).first<{
    id: number; user_id: number; started_at: string; ended_at: string;
    note: string | null; status: string;
  }>();

  if (!existing) {
    return c.json({ detail: "Anfrage nicht gefunden" }, 404);
  }

  const data = await c.req.json<{
    status: "approved" | "rejected";
    review_note?: string;
    started_at?: string;
    ended_at?: string;
  }>();

  const { status, review_note } = data;

  if (!["approved", "rejected"].includes(status)) {
    return c.json({ detail: "Status muss 'approved' oder 'rejected' sein" }, 400);
  }

  const updates: string[] = [
    "status = ?",
    "reviewed_by = ?",
    "reviewed_at = datetime('now')",
  ];
  const values: unknown[] = [status, user.id];

  if (review_note !== undefined) {
    updates.push("review_note = ?");
    values.push(review_note);
  }

  if (status === "approved") {
    if (data.started_at !== undefined) {
      updates.push("started_at = ?");
      values.push(data.started_at);
    }
    if (data.ended_at !== undefined) {
      updates.push("ended_at = ?");
      values.push(data.ended_at);
    }
  }

  values.push(id);
  await c.env.DB.prepare(
    `UPDATE work_time_requests SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...values).run();

  const updated = await c.env.DB.prepare(
    `SELECT w.*, u.username FROM work_time_requests w
     JOIN users u ON w.user_id = u.id
     WHERE w.id = ?`
  ).bind(id).first();

  return c.json(updated);
});
