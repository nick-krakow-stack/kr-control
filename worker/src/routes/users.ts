import { Hono } from "hono";
import { Env, User, VALID_ROLES } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";
import { hashPassword } from "../auth";
import { sendInviteEmail } from "../email";

const users = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Auth required for all routes
users.use("*", authMiddleware);

function userToResponse(user: User, locationIds: number[] = []) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: user.is_active === 1,
    email_verified: user.email_verified === 1,
    recall_hours: user.recall_hours,
    created_at: user.created_at,
    location_ids: locationIds,
  };
}

async function getUserLocationIds(db: D1Database, userId: number): Promise<number[]> {
  const rows = await db.prepare(
    "SELECT location_id FROM user_locations WHERE user_id = ?"
  ).bind(userId).all<{ location_id: number }>();
  return rows.results.map((r) => r.location_id);
}

// ── Self-service profile endpoints (auth only, no admin required) ──────────

users.get("/me/profile", async (c) => {
  const currentUser = c.get("user");
  const user = await c.env.DB.prepare(
    "SELECT id, username, email, role, first_name, last_name, street, zip, city, iban, bic, bank_name, hourly_rate FROM users WHERE id = ?"
  ).bind(currentUser.id).first<Pick<User, "id" | "username" | "email" | "role" | "first_name" | "last_name" | "street" | "zip" | "city" | "iban" | "bic" | "bank_name" | "hourly_rate">>();
  if (!user) return c.json({ detail: "Benutzer nicht gefunden" }, 404);
  return c.json(user);
});

users.patch("/me/profile", async (c) => {
  const currentUser = c.get("user");
  const data = await c.req.json();

  const ALLOWED_FIELDS = ["first_name", "last_name", "street", "zip", "city", "iban", "bic", "bank_name"] as const;

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of ALLOWED_FIELDS) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (updates.length > 0) {
    values.push(currentUser.id);
    await c.env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values).run();
  }

  const updated = await c.env.DB.prepare(
    "SELECT id, username, email, role, first_name, last_name, street, zip, city, iban, bic, bank_name, hourly_rate FROM users WHERE id = ?"
  ).bind(currentUser.id).first<Pick<User, "id" | "username" | "email" | "role" | "first_name" | "last_name" | "street" | "zip" | "city" | "iban" | "bic" | "bank_name" | "hourly_rate">>();
  return c.json(updated);
});

// ── Admin-only routes ──────────────────────────────────────────────────────

users.get("/", requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM users ORDER BY created_at DESC"
  ).all<User>();

  const result = await Promise.all(
    rows.results.map(async (u) => userToResponse(u, await getUserLocationIds(c.env.DB, u.id)))
  );
  return c.json(result);
});

users.post("/", requireAdmin, async (c) => {
  const currentUser = c.get("user");
  const data = await c.req.json();
  const { username, email, role, recall_hours } = data;

  if (!VALID_ROLES.has(role)) {
    return c.json({ detail: `Ungültige Rolle. Erlaubt: ${[...VALID_ROLES].join(", ")}` }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username = ? OR email = ?"
  ).bind(username, email).first();
  if (existing) {
    return c.json({ detail: "Benutzername oder E-Mail bereits vergeben" }, 400);
  }

  const inviteToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const result = await c.env.DB.prepare(
    `INSERT INTO users (username, email, role, recall_hours, invite_token, invite_expires_at, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(username, email, role, recall_hours || 24, inviteToken, inviteExpiresAt, currentUser.id).run();

  const newUser = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(result.meta.last_row_id).first<User>();

  c.executionCtx.waitUntil(
    sendInviteEmail(
      c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME,
      c.env.FRONTEND_URL, email, username, inviteToken
    )
  );

  return c.json(userToResponse(newUser!, []), 201);
});

users.get("/:id", requireAdmin, async (c) => {
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(Number(c.req.param("id"))).first<User>();
  if (!user) return c.json({ detail: "Benutzer nicht gefunden" }, 404);
  return c.json(userToResponse(user, await getUserLocationIds(c.env.DB, user.id)));
});

users.put("/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const data = await c.req.json();
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id).first<User>();
  if (!user) return c.json({ detail: "Benutzer nicht gefunden" }, 404);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.role !== undefined) {
    if (!VALID_ROLES.has(data.role)) return c.json({ detail: "Ungültige Rolle" }, 400);
    updates.push("role = ?"); values.push(data.role);
  }
  if (data.username !== undefined) {
    const ex = await c.env.DB.prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .bind(data.username, id).first();
    if (ex) return c.json({ detail: "Benutzername bereits vergeben" }, 400);
    updates.push("username = ?"); values.push(data.username);
  }
  if (data.email !== undefined) {
    const ex = await c.env.DB.prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .bind(data.email, id).first();
    if (ex) return c.json({ detail: "E-Mail bereits registriert" }, 400);
    updates.push("email = ?"); values.push(data.email);
  }
  if (data.is_active !== undefined) {
    updates.push("is_active = ?"); values.push(data.is_active ? 1 : 0);
  }
  if (data.recall_hours !== undefined) {
    updates.push("recall_hours = ?"); values.push(data.recall_hours);
  }
  if (data.hourly_rate !== undefined) {
    updates.push("hourly_rate = ?"); values.push(data.hourly_rate);
  }

  if (updates.length > 0) {
    values.push(id);
    await c.env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values).run();
  }

  const updated = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id).first<User>();
  return c.json(userToResponse(updated!, await getUserLocationIds(c.env.DB, id)));
});

users.patch("/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const data = await c.req.json();
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id).first<User>();
  if (!user) return c.json({ detail: "Benutzer nicht gefunden" }, 404);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.hourly_rate !== undefined) {
    updates.push("hourly_rate = ?"); values.push(data.hourly_rate);
  }

  if (updates.length > 0) {
    values.push(id);
    await c.env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values).run();
  }

  const updated = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id).first<User>();
  return c.json(userToResponse(updated!, await getUserLocationIds(c.env.DB, id)));
});

users.delete("/:id", requireAdmin, async (c) => {
  const currentUser = c.get("user");
  const id = Number(c.req.param("id"));
  if (id === currentUser.id) {
    return c.json({ detail: "Sie können Ihren eigenen Account nicht löschen" }, 400);
  }
  const user = await c.env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first();
  if (!user) return c.json({ detail: "Benutzer nicht gefunden" }, 404);
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

users.put("/:id/locations", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const { location_ids } = await c.req.json();

  const user = await c.env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first();
  if (!user) return c.json({ detail: "Benutzer nicht gefunden" }, 404);

  await c.env.DB.prepare("DELETE FROM user_locations WHERE user_id = ?").bind(id).run();

  if (location_ids?.length > 0) {
    const inserts = location_ids.map((_: number) => "(?, ?)").join(", ");
    const vals: number[] = [];
    for (const locId of location_ids) { vals.push(id, locId); }
    await c.env.DB.prepare(`INSERT INTO user_locations (user_id, location_id) VALUES ${inserts}`)
      .bind(...vals).run();
  }

  return c.json({ ok: true });
});

users.post("/:id/resend-invite", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id).first<User>();
  if (!user) return c.json({ detail: "Benutzer nicht gefunden" }, 404);
  if (user.email_verified) {
    return c.json({ detail: "Benutzer hat sein Passwort bereits gesetzt" }, 400);
  }

  const inviteToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    "UPDATE users SET invite_token = ?, invite_expires_at = ? WHERE id = ?"
  ).bind(inviteToken, inviteExpiresAt, id).run();

  c.executionCtx.waitUntil(
    sendInviteEmail(
      c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME,
      c.env.FRONTEND_URL, user.email, user.username, inviteToken
    )
  );

  return c.json({ ok: true });
});

export default users;
