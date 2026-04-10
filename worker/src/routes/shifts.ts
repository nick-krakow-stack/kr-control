import { Hono } from "hono";
import { Env, User, Shift } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";

const shifts = new Hono<{ Bindings: Env; Variables: { user: User } }>();

shifts.use("*", authMiddleware);

shifts.get("/", async (c) => {
  const user = c.get("user");
  const { user_id, location_id, date_from, date_to } = c.req.query();

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (user.role !== "admin") {
    conditions.push("shifts.user_id = ?");
    values.push(user.id);
  } else if (user_id) {
    conditions.push("shifts.user_id = ?");
    values.push(Number(user_id));
  }

  if (location_id) {
    conditions.push("shifts.location_id = ?");
    values.push(Number(location_id));
  }
  if (date_from) {
    conditions.push("shifts.started_at >= ?");
    values.push(date_from);
  }
  if (date_to) {
    conditions.push("shifts.started_at <= ?");
    values.push(date_to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await c.env.DB.prepare(
    `SELECT shifts.*, users.username, locations.name as location_name
     FROM shifts
     JOIN users ON shifts.user_id = users.id
     JOIN locations ON shifts.location_id = locations.id
     ${where}
     ORDER BY shifts.started_at DESC`
  ).bind(...values).all<Shift>();

  return c.json(rows.results);
});

shifts.post("/", async (c) => {
  const user = c.get("user");
  if (!["admin", "mitarbeiter"].includes(user.role)) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }

  const data = await c.req.json();
  const { location_id } = data;

  if (!location_id) {
    return c.json({ detail: "location_id ist ein Pflichtfeld" }, 400);
  }

  const startedAt = new Date().toISOString();

  const result = await c.env.DB.prepare(
    `INSERT INTO shifts (user_id, location_id, started_at, ended_at, case_count)
     VALUES (?, ?, ?, NULL, 0)`
  ).bind(user.id, Number(location_id), startedAt).run();

  const shift = await c.env.DB.prepare(
    `SELECT shifts.*, users.username, locations.name as location_name
     FROM shifts
     JOIN users ON shifts.user_id = users.id
     JOIN locations ON shifts.location_id = locations.id
     WHERE shifts.id = ?`
  ).bind(result.meta.last_row_id).first<Shift>();

  return c.json(shift, 201);
});

shifts.patch("/:id/end", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));

  const shift = await c.env.DB.prepare("SELECT * FROM shifts WHERE id = ?")
    .bind(id).first<Shift>();
  if (!shift) return c.json({ detail: "Schicht nicht gefunden" }, 404);

  if (shift.user_id !== user.id && user.role !== "admin") {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }

  const endedAt = new Date().toISOString();
  await c.env.DB.prepare("UPDATE shifts SET ended_at = ? WHERE id = ?")
    .bind(endedAt, id).run();

  const updated = await c.env.DB.prepare(
    `SELECT shifts.*, users.username, locations.name as location_name
     FROM shifts
     JOIN users ON shifts.user_id = users.id
     JOIN locations ON shifts.location_id = locations.id
     WHERE shifts.id = ?`
  ).bind(id).first<Shift>();

  return c.json(updated);
});

shifts.get("/stats", requireAdmin, async (c) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  const todayShifts = await c.env.DB.prepare(
    "SELECT COUNT(*) as c FROM shifts WHERE DATE(started_at) = ?"
  ).bind(todayStr).first<{ c: number }>();

  const todayCases = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(case_count), 0) as c FROM shifts WHERE DATE(started_at) = ?"
  ).bind(todayStr).first<{ c: number }>();

  const monthShifts = await c.env.DB.prepare(
    "SELECT COUNT(*) as c FROM shifts WHERE strftime('%Y-%m', started_at) = ?"
  ).bind(monthStr).first<{ c: number }>();

  const monthCases = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(case_count), 0) as c FROM shifts WHERE strftime('%Y-%m', started_at) = ?"
  ).bind(monthStr).first<{ c: number }>();

  const byUser = await c.env.DB.prepare(
    `SELECT shifts.user_id, users.username, COUNT(*) as total_shifts, COALESCE(SUM(shifts.case_count), 0) as total_cases
     FROM shifts
     JOIN users ON shifts.user_id = users.id
     WHERE strftime('%Y-%m', shifts.started_at) = ?
     GROUP BY shifts.user_id, users.username`
  ).bind(monthStr).all<{ user_id: number; username: string; total_shifts: number; total_cases: number }>();

  return c.json({
    today: { shifts: todayShifts?.c ?? 0, cases: todayCases?.c ?? 0 },
    month: { shifts: monthShifts?.c ?? 0, cases: monthCases?.c ?? 0 },
    by_user: byUser.results,
  });
});

export { shifts as shiftsRouter };
