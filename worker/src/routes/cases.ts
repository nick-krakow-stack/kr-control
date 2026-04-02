import { Hono } from "hono";
import { Env, User, Case, CaseImage, SELF_CONTROL_ROLES } from "../types";
import { authMiddleware, getAccessibleLocationIds } from "../middleware";

const cases = new Hono<{ Bindings: Env; Variables: { user: User } }>();

cases.use("*", authMiddleware);

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

async function getCaseWithImages(db: D1Database, caseId: number) {
  const c = await db.prepare("SELECT * FROM cases WHERE id = ?").bind(caseId).first<Case>();
  if (!c) return null;
  const images = await db.prepare("SELECT * FROM case_images WHERE case_id = ?")
    .bind(caseId).all<CaseImage>();
  const loc = await db.prepare("SELECT * FROM locations WHERE id = ?")
    .bind(c.location_id).first();
  return { ...c, images: images.results, location: loc };
}

async function checkLocationAccess(db: D1Database, user: User, locationId: number): Promise<boolean> {
  const accessible = await getAccessibleLocationIds(db, user);
  if (accessible === null) return true;
  return accessible.includes(locationId);
}

cases.get("/", async (c) => {
  const user = c.get("user");
  const accessible = await getAccessibleLocationIds(c.env.DB, user);
  const { location_id, status, search, limit = "100", offset = "0" } = c.req.query();

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (accessible !== null) {
    if (accessible.length === 0) return c.json([]);
    conditions.push(`location_id IN (${accessible.map(() => "?").join(",")})`);
    values.push(...accessible);
  }
  if (location_id) { conditions.push("location_id = ?"); values.push(Number(location_id)); }
  if (status) { conditions.push("status = ?"); values.push(status); }
  if (search) { conditions.push("license_plate LIKE ?"); values.push(`%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(Number(limit), Number(offset));

  const rows = await c.env.DB.prepare(
    `SELECT * FROM cases ${where} ORDER BY reported_at DESC LIMIT ? OFFSET ?`
  ).bind(...values).all<Case>();

  const result = await Promise.all(rows.results.map(async (ca) => {
    const images = await c.env.DB.prepare("SELECT * FROM case_images WHERE case_id = ?")
      .bind(ca.id).all<CaseImage>();
    const loc = await c.env.DB.prepare("SELECT * FROM locations WHERE id = ?")
      .bind(ca.location_id).first();
    return { ...ca, images: images.results, location: loc };
  }));

  return c.json(result);
});

cases.post("/", async (c) => {
  const user = c.get("user");
  const formData = await c.req.formData();

  const locationId = Number(formData.get("location_id"));
  const licensePlate = ((formData.get("license_plate") as string) || "").toUpperCase().trim();
  const reportedAtStr = formData.get("reported_at") as string | null;
  const notes = formData.get("notes") as string | null;
  const caseTypeInput = formData.get("case_type") as string | null;

  if (!locationId || !licensePlate) {
    return c.json({ detail: "location_id und license_plate sind Pflichtfelder" }, 400);
  }
  if (!(await checkLocationAccess(c.env.DB, user, locationId))) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }

  const reportedAt = reportedAtStr ? new Date(reportedAtStr).toISOString() : new Date().toISOString();
  const paymentDeadline = new Date(new Date(reportedAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  let initialStatus: string;
  let caseType: string;
  let recallDeadline: string | null = null;

  if (user.role === "self_control_business") {
    initialStatus = "pending"; caseType = "self_control_ticket";
    recallDeadline = new Date(new Date(reportedAt).getTime() + user.recall_hours * 60 * 60 * 1000).toISOString();
  } else if (user.role === "self_control_private") {
    initialStatus = "pending"; caseType = "self_control_direct";
    recallDeadline = new Date(new Date(reportedAt).getTime() + user.recall_hours * 60 * 60 * 1000).toISOString();
  } else {
    initialStatus = "new";
    caseType = caseTypeInput || "standard";
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO cases (location_id, license_plate, reported_at, notes, status, case_type,
     payment_deadline, recall_deadline, reported_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(locationId, licensePlate, reportedAt, notes || null, initialStatus, caseType,
    paymentDeadline, recallDeadline, user.id).run();

  const caseId = result.meta.last_row_id as number;

  // Handle image uploads
  const imageFiles = formData.getAll("images") as unknown as File[];
  for (const file of imageFiles) {
    if (!file.name || file.size > MAX_FILE_SIZE) continue;
    const contentType = file.type || "image/jpeg";
    if (!ALLOWED_TYPES.has(contentType) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) continue;

    const ext = file.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() || ".jpg";
    const filename = `${crypto.randomUUID()}${ext}`;
    const buffer = await file.arrayBuffer();

    await c.env.UPLOADS.put(filename, buffer, { httpMetadata: { contentType } });
    await c.env.DB.prepare(
      "INSERT INTO case_images (case_id, filename, original_filename, image_type) VALUES (?, ?, ?, ?)"
    ).bind(caseId, filename, file.name, "additional").run();
  }

  const created = await getCaseWithImages(c.env.DB, caseId);
  return c.json(created, 201);
});

cases.get("/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const ca = await getCaseWithImages(c.env.DB, id);
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, user, ca.location_id))) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }
  return c.json(ca);
});

cases.patch("/:id/status", async (c) => {
  const user = c.get("user");
  if (SELF_CONTROL_ROLES.has(user.role)) {
    return c.json({ detail: "Kein Zugriff auf Statusänderung" }, 403);
  }
  const id = Number(c.req.param("id"));
  const ca = await c.env.DB.prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, user, ca.location_id))) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }

  const { status, ticket_number, notes } = await c.req.json();
  const updates: string[] = ["status = ?"];
  const values: unknown[] = [status];

  if (ticket_number) { updates.push("ticket_number = ?"); values.push(ticket_number); }
  if (notes) {
    const ts = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const newNotes = (ca.notes || "") + `\n[${ts}] ${notes}`;
    updates.push("notes = ?"); values.push(newNotes);
  }
  if (status === "letter_sent") { updates.push("letter_sent_at = ?"); values.push(new Date().toISOString()); }
  if (status === "ordnungsamt") { updates.push("ordnungsamt_requested_at = ?"); values.push(new Date().toISOString()); }

  values.push(id);
  await c.env.DB.prepare(`UPDATE cases SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values).run();

  return c.json({ ok: true });
});

cases.post("/:id/recall", async (c) => {
  const user = c.get("user");
  if (!SELF_CONTROL_ROLES.has(user.role)) {
    return c.json({ detail: "Nur Self-Control-Nutzer können Fälle widerrufen" }, 403);
  }
  const id = Number(c.req.param("id"));
  const ca = await c.env.DB.prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, user, ca.location_id))) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }
  if (ca.status !== "pending") {
    return c.json({ detail: "Nur ausstehende Fälle können widerrufen werden" }, 400);
  }
  if (!ca.recall_deadline || new Date() > new Date(ca.recall_deadline)) {
    return c.json({ detail: "Widerruf-Frist abgelaufen" }, 400);
  }

  await c.env.DB.prepare(
    "UPDATE cases SET status = 'recalled', recalled_at = ? WHERE id = ?"
  ).bind(new Date().toISOString(), id).run();

  return c.json({ ok: true });
});

cases.patch("/:id/image-type", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const { image_id, image_type } = await c.req.json();

  const ca = await c.env.DB.prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, user, ca.location_id))) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }

  const img = await c.env.DB.prepare(
    "SELECT id FROM case_images WHERE id = ? AND case_id = ?"
  ).bind(image_id, id).first();
  if (!img) return c.json({ detail: "Bild nicht gefunden" }, 404);

  await c.env.DB.prepare("UPDATE case_images SET image_type = ? WHERE id = ?")
    .bind(image_type, image_id).run();
  return c.json({ ok: true });
});

cases.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const ca = await c.env.DB.prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, user, ca.location_id))) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }
  if (SELF_CONTROL_ROLES.has(user.role)) {
    if (ca.reported_by_user_id !== user.id || !["pending", "recalled"].includes(ca.status)) {
      return c.json({ detail: "Kein Löschrecht für diesen Fall" }, 403);
    }
  }

  // Delete images from R2
  const images = await c.env.DB.prepare("SELECT filename FROM case_images WHERE case_id = ?")
    .bind(id).all<{ filename: string }>();
  await Promise.all(images.results.map((img) => c.env.UPLOADS.delete(img.filename)));

  await c.env.DB.prepare("DELETE FROM cases WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// Serve uploaded images from R2
cases.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  const object = await c.env.UPLOADS.get(filename);
  if (!object) return c.json({ detail: "Nicht gefunden" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000");
  return new Response(object.body, { headers });
});

export default cases;
