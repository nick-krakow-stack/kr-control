import { Hono } from "hono";
import { Env, User, CaseFee, FollowupCostTemplate } from "../types";
import { authMiddleware, requireAdmin, getAccessibleLocationIds } from "../middleware";

const caseFees = new Hono<{ Bindings: Env; Variables: { user: User } }>();

caseFees.use("*", authMiddleware);

// Helper: check location access for a case
async function checkCaseAccess(db: D1Database, user: User, caseId: number): Promise<boolean> {
  const c = await db.prepare("SELECT location_id FROM cases WHERE id = ?").bind(caseId).first<{ location_id: number }>();
  if (!c) return false;
  const accessible = await getAccessibleLocationIds(db, user);
  if (accessible === null) return true;
  return accessible.includes(c.location_id);
}

// GET /case/:caseId — list all case_fees for a case
caseFees.get("/case/:caseId", async (c) => {
  const user = c.get("user");
  const caseId = Number(c.req.param("caseId"));
  if (!(await checkCaseAccess(c.env.DB, user, caseId))) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }
  const rows = await c.env.DB.prepare(
    `SELECT cf.*, u.username FROM case_fees cf
     LEFT JOIN users u ON u.id = cf.recorded_by
     WHERE cf.case_id = ? ORDER BY cf.recorded_at ASC`
  ).bind(caseId).all<CaseFee & { username: string | null }>();
  return c.json(rows.results);
});

// POST /case/:caseId/followup — add followup cost (admin only)
caseFees.post("/case/:caseId/followup", requireAdmin, async (c) => {
  const user = c.get("user");
  const caseId = Number(c.req.param("caseId"));
  const ca = await c.env.DB.prepare("SELECT id, current_fee_stage FROM cases WHERE id = ?")
    .bind(caseId).first<{ id: number; current_fee_stage: number }>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);

  const { stage, amount, label } = await c.req.json<{ stage: number; amount: number; label: string }>();
  if (amount == null || amount <= 0) return c.json({ detail: "Betrag ist Pflichtfeld" }, 400);
  if (stage == null) return c.json({ detail: "Stage ist Pflichtfeld" }, 400);

  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    "INSERT INTO case_fees (case_id, stage, amount, label, recorded_at, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(caseId, stage, amount, label ?? null, now, user.id).run();

  // Update current_fee_stage if new stage is higher
  if (stage > (ca.current_fee_stage ?? 0)) {
    await c.env.DB.prepare("UPDATE cases SET current_fee_stage = ? WHERE id = ?")
      .bind(stage, caseId).run();
  }

  return c.json({ ok: true });
});

// GET /templates — list active followup_cost_templates
caseFees.get("/templates", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM followup_cost_templates WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  ).all<FollowupCostTemplate>();
  return c.json(rows.results);
});

// GET /templates/all — all templates incl. inactive (admin)
caseFees.get("/templates/all", requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM followup_cost_templates ORDER BY sort_order ASC, id ASC"
  ).all<FollowupCostTemplate>();
  return c.json(rows.results);
});

// POST /templates — create template (admin)
caseFees.post("/templates", requireAdmin, async (c) => {
  const { label, amount, sort_order, is_active } = await c.req.json<{
    label: string;
    amount?: number | null;
    sort_order?: number;
    is_active?: number;
  }>();
  if (!label?.trim()) return c.json({ detail: "Label ist Pflichtfeld" }, 400);
  const result = await c.env.DB.prepare(
    "INSERT INTO followup_cost_templates (label, amount, sort_order, is_active) VALUES (?, ?, ?, ?)"
  ).bind(label.trim(), amount ?? null, sort_order ?? 0, is_active ?? 1).run();
  const row = await c.env.DB.prepare("SELECT * FROM followup_cost_templates WHERE id = ?")
    .bind(result.meta.last_row_id).first<FollowupCostTemplate>();
  return c.json(row, 201);
});

// PATCH /templates/:id — update template (admin)
caseFees.patch("/templates/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await c.env.DB.prepare("SELECT * FROM followup_cost_templates WHERE id = ?")
    .bind(id).first<FollowupCostTemplate>();
  if (!existing) return c.json({ detail: "Template nicht gefunden" }, 404);

  const data = await c.req.json<Partial<FollowupCostTemplate>>();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.label !== undefined) { updates.push("label = ?"); values.push(data.label); }
  if (data.amount !== undefined) { updates.push("amount = ?"); values.push(data.amount); }
  if (data.sort_order !== undefined) { updates.push("sort_order = ?"); values.push(data.sort_order); }
  if (data.is_active !== undefined) { updates.push("is_active = ?"); values.push(data.is_active); }

  if (updates.length === 0) return c.json({ detail: "Keine Felder zum Aktualisieren" }, 400);
  values.push(id);
  await c.env.DB.prepare(`UPDATE followup_cost_templates SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values).run();

  const row = await c.env.DB.prepare("SELECT * FROM followup_cost_templates WHERE id = ?")
    .bind(id).first<FollowupCostTemplate>();
  return c.json(row);
});

// DELETE /templates/:id — delete template (admin)
caseFees.delete("/templates/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await c.env.DB.prepare("SELECT id FROM followup_cost_templates WHERE id = ?")
    .bind(id).first();
  if (!existing) return c.json({ detail: "Template nicht gefunden" }, 404);
  await c.env.DB.prepare("DELETE FROM followup_cost_templates WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export default caseFees;
