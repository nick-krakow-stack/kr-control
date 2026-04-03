import { Context, Next } from "hono";
import { verifyToken } from "./auth";
import { Env, User } from "./types";

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ detail: "Nicht authentifiziert" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.SECRET_KEY);
  if (!payload?.sub) {
    return c.json({ detail: "Token ungültig oder abgelaufen" }, 401);
  }

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ? AND is_active = 1"
  ).bind(Number(payload.sub)).first<User>();

  if (!user) {
    return c.json({ detail: "Benutzer nicht gefunden oder inaktiv" }, 401);
  }

  c.set("user", user);
  await next();
}

export async function requireAdmin(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.json({ detail: "Nur Administratoren haben Zugriff" }, 403);
  }
  await next();
}

export async function requireStaff(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const user = c.get("user");
  if (!["admin", "mitarbeiter", "buchhaltung"].includes(user.role)) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }
  await next();
}

export async function requireAdminOrBuchhaltung(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const user = c.get("user");
  if (!["admin", "buchhaltung"].includes(user.role)) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }
  await next();
}

export async function getAccessibleLocationIds(db: D1Database, user: User): Promise<number[] | null> {
  if (user.role === "admin" || user.role === "buchhaltung") return null;
  const rows = await db.prepare(
    "SELECT location_id FROM user_locations WHERE user_id = ?"
  ).bind(user.id).all<{ location_id: number }>();
  return rows.results.map((r) => r.location_id);
}
