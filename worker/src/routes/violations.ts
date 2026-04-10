import { Hono } from "hono";
import { Env, User, Violation } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";

const violationsRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

violationsRouter.use("*", authMiddleware);

violationsRouter.get("/admin", requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM violations ORDER BY sort_order ASC, id ASC"
  ).all<Violation>();
  return c.json(rows.results);
});

violationsRouter.get("/", async (c) => {
  const locationId = c.req.query("location_id");

  if (locationId) {
    const locId = parseInt(locationId, 10);
    if (isNaN(locId)) return c.json({ detail: "Ungültige location_id" }, 400);

    const rows = await c.env.DB.prepare(
      `SELECT v.*, vlp.sort_order as location_sort_order
       FROM violations v
       LEFT JOIN violation_location_priority vlp ON v.id = vlp.violation_id AND vlp.location_id = ?
       WHERE v.is_active = 1
       ORDER BY COALESCE(vlp.sort_order, 999999) ASC, v.sort_order ASC, v.id ASC`
    ).bind(locId).all<Violation & { location_sort_order: number | null }>();

    const result = rows.results.map((r) => ({
      ...r,
      location_sort_order: r.location_sort_order ?? null,
    }));
    return c.json(result);
  }

  const rows = await c.env.DB.prepare(
    "SELECT * FROM violations WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  ).all<Violation>();
  return c.json(rows.results);
});

violationsRouter.post("/", requireAdmin, async (c) => {
  const body = await c.req.json<{
    code?: string;
    description?: string;
    fee_override?: number | null;
    is_active?: number;
    sort_order?: number;
  }>();

  if (!body.code?.trim()) return c.json({ detail: "code ist erforderlich" }, 400);
  if (!body.description?.trim()) return c.json({ detail: "description ist erforderlich" }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT id FROM violations WHERE code = ?"
  ).bind(body.code.trim()).first<{ id: number }>();
  if (existing) return c.json({ detail: "Code bereits vergeben" }, 409);

  const result = await c.env.DB.prepare(
    `INSERT INTO violations (code, description, fee_override, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    body.code.trim(),
    body.description.trim(),
    body.fee_override ?? null,
    body.is_active ?? 1,
    body.sort_order ?? 0
  ).run();

  const created = await c.env.DB.prepare(
    "SELECT * FROM violations WHERE id = ?"
  ).bind(result.meta.last_row_id).first<Violation>();

  return c.json(created, 201);
});

violationsRouter.patch("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ detail: "Ungültige ID" }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT * FROM violations WHERE id = ?"
  ).bind(id).first<Violation>();
  if (!existing) return c.json({ detail: "Nicht gefunden" }, 404);

  const body = await c.req.json<Partial<{
    code: string;
    description: string;
    fee_override: number | null;
    is_active: number;
    sort_order: number;
  }>>();

  if (body.code !== undefined && !body.code.trim()) {
    return c.json({ detail: "code darf nicht leer sein" }, 400);
  }
  if (body.description !== undefined && !body.description.trim()) {
    return c.json({ detail: "description darf nicht leer sein" }, 400);
  }

  if (body.code !== undefined && body.code !== existing.code) {
    const conflict = await c.env.DB.prepare(
      "SELECT id FROM violations WHERE code = ? AND id != ?"
    ).bind(body.code.trim(), id).first<{ id: number }>();
    if (conflict) return c.json({ detail: "Code bereits vergeben" }, 409);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.code !== undefined) { fields.push("code = ?"); values.push(body.code.trim()); }
  if (body.description !== undefined) { fields.push("description = ?"); values.push(body.description.trim()); }
  if ("fee_override" in body) { fields.push("fee_override = ?"); values.push(body.fee_override ?? null); }
  if (body.is_active !== undefined) { fields.push("is_active = ?"); values.push(body.is_active); }
  if (body.sort_order !== undefined) { fields.push("sort_order = ?"); values.push(body.sort_order); }

  if (fields.length === 0) return c.json({ detail: "Keine Felder zum Aktualisieren" }, 400);

  values.push(id);
  await c.env.DB.prepare(
    `UPDATE violations SET ${fields.join(", ")} WHERE id = ?`
  ).bind(...values).run();

  const updated = await c.env.DB.prepare(
    "SELECT * FROM violations WHERE id = ?"
  ).bind(id).first<Violation>();

  return c.json(updated);
});

violationsRouter.delete("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ detail: "Ungültige ID" }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT id FROM violations WHERE id = ?"
  ).bind(id).first<{ id: number }>();
  if (!existing) return c.json({ detail: "Nicht gefunden" }, 404);

  await c.env.DB.prepare("DELETE FROM violations WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

violationsRouter.get("/location/:locationId/priority", requireAdmin, async (c) => {
  const locationId = parseInt(c.req.param("locationId"), 10);
  if (isNaN(locationId)) return c.json({ detail: "Ungültige locationId" }, 400);

  const rows = await c.env.DB.prepare(
    "SELECT violation_id, sort_order FROM violation_location_priority WHERE location_id = ? ORDER BY sort_order ASC"
  ).bind(locationId).all<{ violation_id: number; sort_order: number }>();

  return c.json(rows.results);
});

violationsRouter.put("/location/:locationId/priority", requireAdmin, async (c) => {
  const locationId = parseInt(c.req.param("locationId"), 10);
  if (isNaN(locationId)) return c.json({ detail: "Ungültige locationId" }, 400);

  const body = await c.req.json<{ violation_ids?: number[] }>();
  if (!Array.isArray(body.violation_ids)) {
    return c.json({ detail: "violation_ids muss ein Array sein" }, 400);
  }

  await c.env.DB.prepare(
    "DELETE FROM violation_location_priority WHERE location_id = ?"
  ).bind(locationId).run();

  for (let i = 0; i < body.violation_ids.length; i++) {
    await c.env.DB.prepare(
      "INSERT INTO violation_location_priority (violation_id, location_id, sort_order) VALUES (?, ?, ?)"
    ).bind(body.violation_ids[i], locationId, i).run();
  }

  return c.json({ ok: true });
});

export default violationsRouter;
