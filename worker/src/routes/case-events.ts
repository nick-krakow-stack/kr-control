import { Hono } from "hono";
import { Env, User, CaseEvent } from "../types";
import { authMiddleware, getAccessibleLocationIds } from "../middleware";

const caseEvents = new Hono<{ Bindings: Env; Variables: { user: User } }>();

caseEvents.use("*", authMiddleware);

caseEvents.get("/:caseId", async (c) => {
  const user = c.get("user");
  const caseId = Number(c.req.param("caseId"));

  // Access check: verify user can access this case's location
  const ca = await c.env.DB.prepare("SELECT location_id FROM cases WHERE id = ?").bind(caseId).first<{ location_id: number }>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);

  const accessible = await getAccessibleLocationIds(c.env.DB, user);
  if (accessible !== null && !accessible.includes(ca.location_id)) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }

  const rows = await c.env.DB.prepare(
    `SELECT e.*, u.username
     FROM case_events e
     LEFT JOIN users u ON e.user_id = u.id
     WHERE e.case_id = ?
     ORDER BY e.created_at ASC`
  ).bind(caseId).all<CaseEvent>();

  return c.json(rows.results);
});

export default caseEvents;
