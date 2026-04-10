import { Hono } from "hono";
import { Env, User, Customer } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";
import { sendInviteEmail } from "../email";

const customers = new Hono<{ Bindings: Env; Variables: { user: User } }>();

customers.use("*", authMiddleware, requireAdmin);

customers.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT customers.*,
       (SELECT COUNT(*) FROM locations WHERE locations.customer_id = customers.id) as location_count,
       users.email_verified
     FROM customers
     LEFT JOIN users ON customers.user_id = users.id
     ORDER BY customers.created_at DESC`
  ).all<Customer>();

  return c.json(rows.results);
});

customers.post("/", async (c) => {
  const data = await c.req.json();
  const { name, email, phone, location_ids } = data;

  if (!name || !email) {
    return c.json({ detail: "name und email sind Pflichtfelder" }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)`
  ).bind(name, email, phone ?? null).run();

  const customerId = result.meta.last_row_id as number;

  if (location_ids && location_ids.length > 0) {
    for (const locId of location_ids) {
      await c.env.DB.prepare(
        "UPDATE locations SET customer_id = ? WHERE id = ?"
      ).bind(customerId, locId).run();
    }
  }

  const customer = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ?")
    .bind(customerId).first<Customer>();

  return c.json(customer, 201);
});

customers.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const customer = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ?")
    .bind(id).first<Customer>();
  if (!customer) return c.json({ detail: "Kunde nicht gefunden" }, 404);

  const locations = await c.env.DB.prepare(
    "SELECT * FROM locations WHERE customer_id = ?"
  ).bind(id).all();

  return c.json({ ...customer, locations: locations.results });
});

customers.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const customer = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ?")
    .bind(id).first<Customer>();
  if (!customer) return c.json({ detail: "Kunde nicht gefunden" }, 404);

  const data = await c.req.json();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push("name = ?"); values.push(data.name); }
  if (data.email !== undefined) { updates.push("email = ?"); values.push(data.email); }
  if (data.phone !== undefined) { updates.push("phone = ?"); values.push(data.phone); }
  if (data.is_active !== undefined) { updates.push("is_active = ?"); values.push(data.is_active); }

  if (updates.length > 0) {
    values.push(id);
    await c.env.DB.prepare(`UPDATE customers SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values).run();
  }

  const updated = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ?")
    .bind(id).first<Customer>();
  return c.json(updated);
});

customers.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const customer = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ?")
    .bind(id).first<Customer>();
  if (!customer) return c.json({ detail: "Kunde nicht gefunden" }, 404);

  if (customer.user_id !== null) {
    return c.json({ detail: "Kunde ist mit einem Benutzer verknüpft und kann nicht gelöscht werden" }, 400);
  }

  await c.env.DB.prepare("UPDATE locations SET customer_id = NULL WHERE customer_id = ?")
    .bind(id).run();
  await c.env.DB.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();

  return c.json({ ok: true });
});

customers.post("/:id/invite", async (c) => {
  const id = Number(c.req.param("id"));
  const customer = await c.env.DB.prepare("SELECT * FROM customers WHERE id = ?")
    .bind(id).first<Customer>();
  if (!customer) return c.json({ detail: "Kunde nicht gefunden" }, 404);

  const inviteToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  async function syncLocations(userId: number) {
    const locs = await c.env.DB.prepare(
      "SELECT id FROM locations WHERE customer_id = ?"
    ).bind(customer!.id).all<{ id: number }>();
    for (const loc of locs.results) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO user_locations (user_id, location_id) VALUES (?, ?)"
      ).bind(userId, loc.id).run();
    }
  }

  async function sendInvite(userId: number, email: string, username: string, token: string) {
    c.executionCtx.waitUntil(
      sendInviteEmail(
        c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME,
        c.env.FRONTEND_URL, email, username, token
      )
    );
  }

  // Case 1: customer already has a user_id
  if (customer.user_id !== null) {
    const existingUser = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(customer.user_id).first<{ id: number; email: string; username: string; email_verified: number }>();
    if (existingUser && existingUser.email_verified === 0) {
      // Resend invitation
      await c.env.DB.prepare(
        "UPDATE users SET invite_token = ?, invite_expires_at = ? WHERE id = ?"
      ).bind(inviteToken, inviteExpiresAt, existingUser.id).run();
      await syncLocations(existingUser.id);
      await sendInvite(existingUser.id, existingUser.email, existingUser.username, inviteToken);
    }
    return c.json({ ok: true, user_id: customer.user_id });
  }

  // Case 2: no user_id — check by email
  const existingByEmail = await c.env.DB.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).bind(customer.email).first<{ id: number; email: string; username: string; email_verified: number }>();

  if (existingByEmail) {
    if (existingByEmail.email_verified === 0) {
      // Reuse and resend
      await c.env.DB.prepare(
        "UPDATE users SET invite_token = ?, invite_expires_at = ? WHERE id = ?"
      ).bind(inviteToken, inviteExpiresAt, existingByEmail.id).run();
      await c.env.DB.prepare("UPDATE customers SET user_id = ? WHERE id = ?")
        .bind(existingByEmail.id, id).run();
      await syncLocations(existingByEmail.id);
      await sendInvite(existingByEmail.id, existingByEmail.email, existingByEmail.username, inviteToken);
      return c.json({ ok: true, user_id: existingByEmail.id });
    } else {
      // Already verified — just link
      await c.env.DB.prepare("UPDATE customers SET user_id = ? WHERE id = ?")
        .bind(existingByEmail.id, id).run();
      await syncLocations(existingByEmail.id);
      return c.json({ ok: true, user_id: existingByEmail.id });
    }
  }

  // Case 3: create new user
  const currentUser = c.get("user");
  const username = customer.email.split("@")[0];

  const newUserResult = await c.env.DB.prepare(
    `INSERT INTO users (username, email, role, recall_hours, invite_token, invite_expires_at, created_by_id)
     VALUES (?, ?, 'self_control_business', 24, ?, ?, ?)`
  ).bind(username, customer.email, inviteToken, inviteExpiresAt, currentUser.id).run();

  const newUserId = newUserResult.meta.last_row_id as number;

  await c.env.DB.prepare("UPDATE customers SET user_id = ? WHERE id = ?")
    .bind(newUserId, id).run();
  await syncLocations(newUserId);
  await sendInvite(newUserId, customer.email, username, inviteToken);

  return c.json({ ok: true, user_id: newUserId });
});

export { customers as customersRouter };
