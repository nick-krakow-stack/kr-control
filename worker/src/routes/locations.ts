import { Hono } from "hono";
import { Env, User, Location } from "../types";
import { authMiddleware, requireAdmin, getAccessibleLocationIds } from "../middleware";

const locations = new Hono<{ Bindings: Env; Variables: { user: User } }>();

locations.use("*", authMiddleware);

async function withCasesCount(db: D1Database, loc: Location): Promise<Location> {
  const row = await db.prepare("SELECT COUNT(*) as c FROM cases WHERE location_id = ?")
    .bind(loc.id).first<{ c: number }>();
  return { ...loc, cases_count: row?.c ?? 0 };
}

locations.get("/", async (c) => {
  const user = c.get("user");
  const accessible = await getAccessibleLocationIds(c.env.DB, user);

  let query = "SELECT * FROM locations ORDER BY created_at DESC";
  let rows: Location[];

  if (accessible !== null) {
    if (accessible.length === 0) return c.json([]);
    const placeholders = accessible.map(() => "?").join(",");
    const result = await c.env.DB.prepare(
      `SELECT * FROM locations WHERE id IN (${placeholders}) ORDER BY created_at DESC`
    ).bind(...accessible).all<Location>();
    rows = result.results;
  } else {
    const result = await c.env.DB.prepare(query).all<Location>();
    rows = result.results;
  }

  const result = await Promise.all(rows.map((l) => withCasesCount(c.env.DB, l)));
  return c.json(result);
});

locations.post("/", requireAdmin, async (c) => {
  const data = await c.req.json();
  const result = await c.env.DB.prepare(
    `INSERT INTO locations (name, address, gps_lat, gps_lng, spots_count, max_duration_minutes, client_name, contract_type, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.name, data.address ?? null, data.gps_lat ?? null, data.gps_lng ?? null,
    data.spots_count ?? 0, data.max_duration_minutes ?? 120,
    data.client_name ?? null, data.contract_type ?? "standard", data.notes ?? null
  ).run();

  const loc = await c.env.DB.prepare("SELECT * FROM locations WHERE id = ?")
    .bind(result.meta.last_row_id).first<Location>();
  return c.json({ ...loc!, cases_count: 0 }, 201);
});

locations.get("/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const accessible = await getAccessibleLocationIds(c.env.DB, user);
  if (accessible !== null && !accessible.includes(id)) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }
  const loc = await c.env.DB.prepare("SELECT * FROM locations WHERE id = ?")
    .bind(id).first<Location>();
  if (!loc) return c.json({ detail: "Parkplatz nicht gefunden" }, 404);
  return c.json(await withCasesCount(c.env.DB, loc));
});

locations.put("/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const data = await c.req.json();
  const loc = await c.env.DB.prepare("SELECT id FROM locations WHERE id = ?").bind(id).first();
  if (!loc) return c.json({ detail: "Parkplatz nicht gefunden" }, 404);

  await c.env.DB.prepare(
    `UPDATE locations SET name=?, address=?, gps_lat=?, gps_lng=?, spots_count=?,
     max_duration_minutes=?, client_name=?, contract_type=?, notes=? WHERE id=?`
  ).bind(
    data.name, data.address ?? null, data.gps_lat ?? null, data.gps_lng ?? null,
    data.spots_count ?? 0, data.max_duration_minutes ?? 120,
    data.client_name ?? null, data.contract_type ?? "standard", data.notes ?? null, id
  ).run();

  const updated = await c.env.DB.prepare("SELECT * FROM locations WHERE id = ?")
    .bind(id).first<Location>();
  return c.json(await withCasesCount(c.env.DB, updated!));
});

locations.delete("/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const loc = await c.env.DB.prepare("SELECT id FROM locations WHERE id = ?").bind(id).first();
  if (!loc) return c.json({ detail: "Parkplatz nicht gefunden" }, 404);
  await c.env.DB.prepare("DELETE FROM locations WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export default locations;
