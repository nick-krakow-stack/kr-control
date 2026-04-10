import { Hono } from "hono";
import { Env, User, VehicleType } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";

const vehicleTypesRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

vehicleTypesRouter.use("*", authMiddleware);

// GET /all — alle inkl. inaktive (Admin)
vehicleTypesRouter.get("/all", requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM vehicle_types ORDER BY sort_order ASC, id ASC"
  ).all<VehicleType>();
  return c.json(rows.results);
});

// GET /location-priority/:locationId — Standort-spezifische sort_orders (Admin)
vehicleTypesRouter.get("/location-priority/:locationId", requireAdmin, async (c) => {
  const locationId = parseInt(c.req.param("locationId"), 10);
  if (isNaN(locationId)) return c.json({ detail: "Ungültige locationId" }, 400);

  const rows = await c.env.DB.prepare(
    "SELECT vehicle_type_id, sort_order FROM vehicle_type_location_priority WHERE location_id = ? ORDER BY sort_order ASC"
  ).bind(locationId).all<{ vehicle_type_id: number; sort_order: number }>();

  return c.json(rows.results);
});

// GET / — aktive Typen, optional ?locationId=N für Standort-Prio-Sortierung
vehicleTypesRouter.get("/", async (c) => {
  const locationIdStr = c.req.query("locationId");

  if (locationIdStr) {
    const locationId = parseInt(locationIdStr, 10);
    if (isNaN(locationId)) return c.json({ detail: "Ungültige locationId" }, 400);

    const rows = await c.env.DB.prepare(
      `SELECT vt.*, COALESCE(vlp.sort_order, vt.sort_order) AS effective_sort
       FROM vehicle_types vt
       LEFT JOIN vehicle_type_location_priority vlp
         ON vlp.vehicle_type_id = vt.id AND vlp.location_id = ?
       WHERE vt.is_active = 1
       ORDER BY effective_sort ASC, vt.id ASC`
    ).bind(locationId).all<VehicleType & { effective_sort: number }>();

    return c.json(rows.results);
  }

  const rows = await c.env.DB.prepare(
    "SELECT * FROM vehicle_types WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  ).all<VehicleType>();
  return c.json(rows.results);
});

// POST / — neuen Fahrzeugtyp erstellen (Admin)
vehicleTypesRouter.post("/", requireAdmin, async (c) => {
  const body = await c.req.json<{
    number?: string;
    name?: string;
    sort_order?: number;
    is_active?: number;
  }>();

  if (!body.number?.trim()) return c.json({ detail: "number ist erforderlich" }, 400);
  if (!body.name?.trim()) return c.json({ detail: "name ist erforderlich" }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT id FROM vehicle_types WHERE number = ?"
  ).bind(body.number.trim()).first<{ id: number }>();
  if (existing) return c.json({ detail: "Nummer bereits vergeben" }, 409);

  const result = await c.env.DB.prepare(
    `INSERT INTO vehicle_types (number, name, sort_order, is_active)
     VALUES (?, ?, ?, ?)`
  ).bind(
    body.number.trim(),
    body.name.trim(),
    body.sort_order ?? 0,
    body.is_active ?? 1
  ).run();

  const created = await c.env.DB.prepare(
    "SELECT * FROM vehicle_types WHERE id = ?"
  ).bind(result.meta.last_row_id).first<VehicleType>();

  return c.json(created, 201);
});

// PATCH /:id — bearbeiten (Admin)
vehicleTypesRouter.patch("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ detail: "Ungültige ID" }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT * FROM vehicle_types WHERE id = ?"
  ).bind(id).first<VehicleType>();
  if (!existing) return c.json({ detail: "Nicht gefunden" }, 404);

  const body = await c.req.json<Partial<{
    number: string;
    name: string;
    sort_order: number;
    is_active: number;
  }>>();

  if (body.number !== undefined && !body.number.trim()) {
    return c.json({ detail: "number darf nicht leer sein" }, 400);
  }
  if (body.name !== undefined && !body.name.trim()) {
    return c.json({ detail: "name darf nicht leer sein" }, 400);
  }

  if (body.number !== undefined && body.number.trim() !== existing.number) {
    const conflict = await c.env.DB.prepare(
      "SELECT id FROM vehicle_types WHERE number = ? AND id != ?"
    ).bind(body.number.trim(), id).first<{ id: number }>();
    if (conflict) return c.json({ detail: "Nummer bereits vergeben" }, 409);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.number !== undefined) { fields.push("number = ?"); values.push(body.number.trim()); }
  if (body.name !== undefined) { fields.push("name = ?"); values.push(body.name.trim()); }
  if (body.sort_order !== undefined) { fields.push("sort_order = ?"); values.push(body.sort_order); }
  if (body.is_active !== undefined) { fields.push("is_active = ?"); values.push(body.is_active); }

  if (fields.length === 0) return c.json({ detail: "Keine Felder zum Aktualisieren" }, 400);

  values.push(id);
  await c.env.DB.prepare(
    `UPDATE vehicle_types SET ${fields.join(", ")} WHERE id = ?`
  ).bind(...values).run();

  const updated = await c.env.DB.prepare(
    "SELECT * FROM vehicle_types WHERE id = ?"
  ).bind(id).first<VehicleType>();

  return c.json(updated);
});

// DELETE /:id — löschen (Admin)
vehicleTypesRouter.delete("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ detail: "Ungültige ID" }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT id FROM vehicle_types WHERE id = ?"
  ).bind(id).first<{ id: number }>();
  if (!existing) return c.json({ detail: "Nicht gefunden" }, 404);

  await c.env.DB.prepare("DELETE FROM vehicle_type_location_priority WHERE vehicle_type_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM vehicle_types WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// POST /location-priority — Standort-Priorität setzen (Admin)
vehicleTypesRouter.post("/location-priority", requireAdmin, async (c) => {
  const body = await c.req.json<{ vehicle_type_id: number; location_id: number; sort_order: number }>();
  if (!body.vehicle_type_id || !body.location_id || body.sort_order === undefined) {
    return c.json({ detail: "vehicle_type_id, location_id und sort_order sind erforderlich" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO vehicle_type_location_priority (vehicle_type_id, location_id, sort_order)
     VALUES (?, ?, ?)`
  ).bind(body.vehicle_type_id, body.location_id, body.sort_order).run();

  return c.json({ ok: true });
});

// DELETE /location-priority/:locationId/:vehicleTypeId — Prio zurücksetzen (Admin)
vehicleTypesRouter.delete("/location-priority/:locationId/:vehicleTypeId", requireAdmin, async (c) => {
  const locationId = parseInt(c.req.param("locationId"), 10);
  const vehicleTypeId = parseInt(c.req.param("vehicleTypeId"), 10);
  if (isNaN(locationId) || isNaN(vehicleTypeId)) return c.json({ detail: "Ungültige Parameter" }, 400);

  await c.env.DB.prepare(
    "DELETE FROM vehicle_type_location_priority WHERE location_id = ? AND vehicle_type_id = ?"
  ).bind(locationId, vehicleTypeId).run();

  return c.json({ ok: true });
});

export default vehicleTypesRouter;
