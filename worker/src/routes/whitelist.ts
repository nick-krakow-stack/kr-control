import { Hono } from "hono";
import { Env, User, WhitelistEntry } from "../types";
import { authMiddleware, getAccessibleLocationIds } from "../middleware";

const whitelist = new Hono<{ Bindings: Env; Variables: { user: User } }>();

whitelist.use("*", authMiddleware);

whitelist.get("/", async (c) => {
  const user = c.get("user");
  const { location_id } = c.req.query();
  const accessible = await getAccessibleLocationIds(c.env.DB, user);

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (location_id) {
    const locIdNum = Number(location_id);
    if (accessible !== null && !accessible.includes(locIdNum)) {
      return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
    }
    conditions.push("whitelist.location_id = ?");
    values.push(locIdNum);
  } else if (accessible !== null) {
    if (accessible.length === 0) return c.json([]);
    conditions.push(`whitelist.location_id IN (${accessible.map(() => "?").join(",")})`);
    values.push(...accessible);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await c.env.DB.prepare(
    `SELECT whitelist.*, locations.name as location_name
     FROM whitelist
     LEFT JOIN locations ON whitelist.location_id = locations.id
     ${where}
     ORDER BY whitelist.created_at DESC`
  ).bind(...values).all<WhitelistEntry>();

  return c.json(rows.results);
});

whitelist.post("/", async (c) => {
  const user = c.get("user");
  const data = await c.req.json();
  const { location_id, license_plate, valid_from, valid_until, note } = data;

  if (!location_id || !license_plate) {
    return c.json({ detail: "location_id und license_plate sind Pflichtfelder" }, 400);
  }

  const accessible = await getAccessibleLocationIds(c.env.DB, user);
  if (accessible !== null && !accessible.includes(Number(location_id))) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO whitelist (location_id, license_plate, valid_from, valid_until, note)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(Number(location_id), license_plate, valid_from ?? null, valid_until ?? null, note ?? null).run();

  const entry = await c.env.DB.prepare(
    `SELECT whitelist.*, locations.name as location_name
     FROM whitelist
     LEFT JOIN locations ON whitelist.location_id = locations.id
     WHERE whitelist.id = ?`
  ).bind(result.meta.last_row_id).first<WhitelistEntry>();

  return c.json(entry, 201);
});

whitelist.put("/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));

  const entry = await c.env.DB.prepare("SELECT * FROM whitelist WHERE id = ?")
    .bind(id).first<WhitelistEntry>();
  if (!entry) return c.json({ detail: "Eintrag nicht gefunden" }, 404);

  const accessible = await getAccessibleLocationIds(c.env.DB, user);
  if (accessible !== null && !accessible.includes(entry.location_id)) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }

  const data = await c.req.json();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.license_plate !== undefined) { updates.push("license_plate = ?"); values.push(data.license_plate); }
  if (data.valid_from !== undefined) { updates.push("valid_from = ?"); values.push(data.valid_from); }
  if (data.valid_until !== undefined) { updates.push("valid_until = ?"); values.push(data.valid_until); }
  if (data.note !== undefined) { updates.push("note = ?"); values.push(data.note); }

  if (updates.length > 0) {
    values.push(id);
    await c.env.DB.prepare(`UPDATE whitelist SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values).run();
  }

  const updated = await c.env.DB.prepare(
    `SELECT whitelist.*, locations.name as location_name
     FROM whitelist
     LEFT JOIN locations ON whitelist.location_id = locations.id
     WHERE whitelist.id = ?`
  ).bind(id).first<WhitelistEntry>();

  return c.json(updated);
});

whitelist.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));

  const entry = await c.env.DB.prepare("SELECT * FROM whitelist WHERE id = ?")
    .bind(id).first<WhitelistEntry>();
  if (!entry) return c.json({ detail: "Eintrag nicht gefunden" }, 404);

  const accessible = await getAccessibleLocationIds(c.env.DB, user);
  if (accessible !== null && !accessible.includes(entry.location_id)) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }

  await c.env.DB.prepare("DELETE FROM whitelist WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export { whitelist as whitelistRouter };
