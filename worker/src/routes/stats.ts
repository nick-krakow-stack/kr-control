import { Hono } from "hono";
import { Env, User } from "../types";
import { authMiddleware, getAccessibleLocationIds } from "../middleware";

const stats = new Hono<{ Bindings: Env; Variables: { user: User } }>();

stats.use("*", authMiddleware);

stats.get("/", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  const accessible = await getAccessibleLocationIds(db, user);

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  function accessFilter(alias = ""): { cond: string; vals: unknown[] } {
    if (accessible === null) return { cond: "", vals: [] };
    if (accessible.length === 0) return { cond: "1=0", vals: [] };
    const col = alias ? `${alias}.location_id` : "location_id";
    return {
      cond: `${col} IN (${accessible.map(() => "?").join(",")})`,
      vals: [...accessible],
    };
  }

  function buildWhere(extra: string, extraVals: unknown[], alias = "") {
    const af = accessFilter(alias);
    const parts: string[] = [];
    const vals: unknown[] = [];
    if (af.cond) { parts.push(af.cond); vals.push(...af.vals); }
    if (extra) { parts.push(extra); vals.push(...extraVals); }
    return { where: parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "", vals };
  }

  const { where: w0, vals: v0 } = buildWhere("", []);
  const total_cases = ((await db.prepare(`SELECT COUNT(*) as c FROM cases ${w0}`).bind(...v0).first<{ c: number }>())?.c) ?? 0;

  const { where: w1, vals: v1 } = buildWhere("reported_at >= ?", [todayStart.toISOString()]);
  const cases_today = ((await db.prepare(`SELECT COUNT(*) as c FROM cases ${w1}`).bind(...v1).first<{ c: number }>())?.c) ?? 0;

  const { where: w2, vals: v2 } = buildWhere("reported_at >= ?", [weekStart.toISOString()]);
  const cases_week = ((await db.prepare(`SELECT COUNT(*) as c FROM cases ${w2}`).bind(...v2).first<{ c: number }>())?.c) ?? 0;

  const { where: w3, vals: v3 } = buildWhere("reported_at >= ?", [monthStart.toISOString()]);
  const cases_month = ((await db.prepare(`SELECT COUNT(*) as c FROM cases ${w3}`).bind(...v3).first<{ c: number }>())?.c) ?? 0;

  const { where: w4, vals: v4 } = buildWhere("status IN ('new','in_progress','ticket_issued','pending')", []);
  const open_cases = ((await db.prepare(`SELECT COUNT(*) as c FROM cases ${w4}`).bind(...v4).first<{ c: number }>())?.c) ?? 0;

  const { where: w5, vals: v5 } = buildWhere("status IN ('new','ticket_issued') AND payment_deadline < ?", [now.toISOString()]);
  const deadline_exceeded = ((await db.prepare(`SELECT COUNT(*) as c FROM cases ${w5}`).bind(...v5).first<{ c: number }>())?.c) ?? 0;

  // Location count
  let total_locations: number;
  if (accessible === null) {
    total_locations = ((await db.prepare("SELECT COUNT(*) as c FROM locations").first<{ c: number }>())?.c) ?? 0;
  } else if (accessible.length === 0) {
    total_locations = 0;
  } else {
    total_locations = ((await db.prepare(
      `SELECT COUNT(*) as c FROM locations WHERE id IN (${accessible.map(() => "?").join(",")})`
    ).bind(...accessible).first<{ c: number }>())?.c) ?? 0;
  }

  // Status distribution
  const { where: ws, vals: vs } = buildWhere("", []);
  const statusRows = await db.prepare(
    `SELECT status, COUNT(*) as count FROM cases ${ws} GROUP BY status`
  ).bind(...vs).all<{ status: string; count: number }>();

  // Top locations
  let topQuery: string;
  let topVals: unknown[];
  if (accessible === null) {
    topQuery = "SELECT l.name, COUNT(c.id) as count FROM locations l LEFT JOIN cases c ON c.location_id = l.id GROUP BY l.id, l.name ORDER BY count DESC LIMIT 5";
    topVals = [];
  } else if (accessible.length === 0) {
    topQuery = "SELECT '' as name, 0 as count WHERE 1=0";
    topVals = [];
  } else {
    topQuery = `SELECT l.name, COUNT(c.id) as count FROM locations l LEFT JOIN cases c ON c.location_id = l.id WHERE l.id IN (${accessible.map(() => "?").join(",")}) GROUP BY l.id, l.name ORDER BY count DESC LIMIT 5`;
    topVals = [...accessible];
  }
  const topRows = await db.prepare(topQuery).bind(...topVals).all<{ name: string; count: number }>();

  // Recent cases
  const { where: wr, vals: vr } = buildWhere("", []);
  const recentRows = await db.prepare(
    `SELECT id, license_plate, status, case_type, reported_at, location_id, payment_deadline, recall_deadline
     FROM cases ${wr} ORDER BY reported_at DESC LIMIT 10`
  ).bind(...vr).all<{
    id: number; license_plate: string; status: string; case_type: string;
    reported_at: string; location_id: number; payment_deadline: string | null; recall_deadline: string | null;
  }>();

  // Open amounts: sum fee_ticket for open cases joined to location fees
  // Uses location fee if set, otherwise global default
  let open_amount_ticket = 0;  // Fälle ohne Brief → Ticket-Gebühr
  let open_amount_letter = 0;  // Fälle mit Brief → Brief-Gebühr (ersetzt Ticket)

  const defaults = await db.prepare("SELECT key, value FROM settings WHERE key IN ('fee_ticket_default', 'fee_letter_default')").all<{key: string; value: string}>();
  const defaultTicket = Number(defaults.results.find(r => r.key === 'fee_ticket_default')?.value ?? 35);
  const defaultLetter = Number(defaults.results.find(r => r.key === 'fee_letter_default')?.value ?? 15);

  if (accessible === null) {
    const ticketRows = await db.prepare(
      `SELECT c.letter_sent_at, l.fee_ticket, l.fee_letter
       FROM cases c JOIN locations l ON c.location_id = l.id
       WHERE c.status IN ('new','ticket_issued','in_progress')`
    ).all<{letter_sent_at: string | null; fee_ticket: number | null; fee_letter: number | null}>();
    for (const row of ticketRows.results) {
      if (row.letter_sent_at) {
        open_amount_letter += row.fee_letter ?? defaultLetter;
      } else {
        open_amount_ticket += row.fee_ticket ?? defaultTicket;
      }
    }
  } else if (accessible.length > 0) {
    const placeholders = accessible.map(() => "?").join(",");
    const ticketRows = await db.prepare(
      `SELECT c.letter_sent_at, l.fee_ticket, l.fee_letter
       FROM cases c JOIN locations l ON c.location_id = l.id
       WHERE c.status IN ('new','ticket_issued','in_progress') AND c.location_id IN (${placeholders})`
    ).bind(...accessible).all<{letter_sent_at: string | null; fee_ticket: number | null; fee_letter: number | null}>();
    for (const row of ticketRows.results) {
      if (row.letter_sent_at) {
        open_amount_letter += row.fee_letter ?? defaultLetter;
      } else {
        open_amount_ticket += row.fee_ticket ?? defaultTicket;
      }
    }
  }

  return c.json({
    total_cases,
    cases_today,
    cases_week,
    cases_month,
    open_cases,
    deadline_exceeded,
    total_locations,
    open_amount_ticket,
    open_amount_letter,
    status_distribution: statusRows.results,
    top_locations: topRows.results,
    recent_cases: recentRows.results,
  });
});

stats.get("/report", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  const accessible = await getAccessibleLocationIds(db, user);

  const { from, to } = c.req.query();
  const fromDate = from ? new Date(from) : new Date(0);
  const toDate = to ? new Date(to) : new Date();
  // to = end of day
  if (to) { toDate.setHours(23, 59, 59, 999); }

  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();

  // Build location filter
  let locFilter = "";
  let locVals: unknown[] = [];
  if (accessible !== null) {
    if (accessible.length === 0) {
      return c.json({ from: fromISO, to: toISO, total_cases: 0, total_amount_ticket: 0, total_amount_letter: 0, per_location: [] });
    }
    locFilter = `AND c.location_id IN (${accessible.map(() => "?").join(",")})`;
    locVals = [...accessible];
  }

  // Total cases in range
  const totalRow = await db.prepare(
    `SELECT COUNT(*) as cnt FROM cases c WHERE c.reported_at >= ? AND c.reported_at <= ? ${locFilter}`
  ).bind(fromISO, toISO, ...locVals).first<{ cnt: number }>();
  const total_cases = totalRow?.cnt ?? 0;

  // Get fee defaults
  const defaults = await db.prepare(
    "SELECT key, value FROM settings WHERE key IN ('fee_ticket_default', 'fee_letter_default')"
  ).all<{ key: string; value: string }>();
  const defaultTicket = Number(defaults.results.find(r => r.key === "fee_ticket_default")?.value ?? 35);
  const defaultLetter = Number(defaults.results.find(r => r.key === "fee_letter_default")?.value ?? 15);

  // Per-location breakdown
  let locQuery: string;
  let locQueryVals: unknown[];
  if (accessible === null) {
    locQuery = `
      SELECT l.id, l.name, l.fee_ticket, l.fee_letter,
             COUNT(c.id) as case_count,
             SUM(CASE WHEN c.letter_sent_at IS NULL THEN 1 ELSE 0 END) as ticket_only_count,
             SUM(CASE WHEN c.letter_sent_at IS NOT NULL THEN 1 ELSE 0 END) as letter_count
      FROM locations l
      LEFT JOIN cases c ON c.location_id = l.id AND c.reported_at >= ? AND c.reported_at <= ?
      GROUP BY l.id, l.name, l.fee_ticket, l.fee_letter
      HAVING case_count > 0
      ORDER BY case_count DESC
    `;
    locQueryVals = [fromISO, toISO];
  } else {
    const ph = accessible.map(() => "?").join(",");
    locQuery = `
      SELECT l.id, l.name, l.fee_ticket, l.fee_letter,
             COUNT(c.id) as case_count,
             SUM(CASE WHEN c.letter_sent_at IS NULL THEN 1 ELSE 0 END) as ticket_only_count,
             SUM(CASE WHEN c.letter_sent_at IS NOT NULL THEN 1 ELSE 0 END) as letter_count
      FROM locations l
      LEFT JOIN cases c ON c.location_id = l.id AND c.reported_at >= ? AND c.reported_at <= ?
      WHERE l.id IN (${ph})
      GROUP BY l.id, l.name, l.fee_ticket, l.fee_letter
      HAVING case_count > 0
      ORDER BY case_count DESC
    `;
    locQueryVals = [fromISO, toISO, ...accessible];
  }

  const locRows = await db.prepare(locQuery).bind(...locQueryVals).all<{
    id: number; name: string; fee_ticket: number | null; fee_letter: number | null;
    case_count: number; ticket_only_count: number; letter_count: number;
  }>();

  let total_amount_ticket = 0;
  let total_amount_letter = 0;

  const per_location = locRows.results.map((l) => {
    const feeT = l.fee_ticket ?? defaultTicket;
    const feeL = l.fee_letter ?? defaultLetter;
    const amt_ticket = l.ticket_only_count * feeT;   // nur Fälle ohne Brief
    const amt_letter = l.letter_count * feeL;          // Fälle mit Brief (ersetzt Ticket)
    total_amount_ticket += amt_ticket;
    total_amount_letter += amt_letter;
    return {
      location_id: l.id,
      name: l.name,
      count: l.case_count,
      amount_ticket: amt_ticket,
      amount_letter: amt_letter,
    };
  });

  return c.json({ from: fromISO, to: toISO, total_cases, total_amount_ticket, total_amount_letter, per_location });
});

export default stats;
