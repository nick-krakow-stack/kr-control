import { Hono } from "hono";
import { Env, User } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";

const settings = new Hono<{ Bindings: Env; Variables: { user: User } }>();

settings.use("*", authMiddleware);

settings.get("/", requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const result: Record<string, string | number> = {};
  for (const row of rows.results) {
    result[row.key] = isNaN(Number(row.value)) ? row.value : Number(row.value);
  }
  return c.json(result);
});

settings.put("/", requireAdmin, async (c) => {
  const data = await c.req.json() as Record<string, unknown>;
  const now = new Date().toISOString();
  const allowed = ["fee_ticket_default", "fee_letter_default"];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      await c.env.DB.prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at"
      ).bind(key, String(data[key]), now).run();
    }
  }
  const rows = await c.env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const result: Record<string, string | number> = {};
  for (const row of rows.results) {
    result[row.key] = isNaN(Number(row.value)) ? row.value : Number(row.value);
  }
  return c.json(result);
});

export default settings;
