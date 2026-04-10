import { Hono } from "hono";
import { Env, User, Case, CaseImage, SELF_CONTROL_ROLES } from "../types";
import { authMiddleware, requireAdmin, requireAdminOrBuchhaltung, getAccessibleLocationIds } from "../middleware";
import { sendRecallConfirmationEmail } from "../email";

async function sendAdminNotification(
  env: Env,
  db: D1Database,
  subject: string,
  body: string
): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  try {
    const admin = await db.prepare(
      "SELECT email FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id ASC LIMIT 1"
    ).first<{ email: string }>();
    if (!admin?.email) return;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${env.SMTP_FROM_NAME} <${env.SMTP_FROM}>`,
        to: [admin.email],
        subject,
        html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${body}</pre>`,
      }),
    });
  } catch {
    // ignore
  }
}

function addWorkdays(date: Date, days: number): number {
  const d = new Date(date.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return Math.floor(d.getTime() / 1000);
}

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

async function logEvent(db: D1Database, caseId: number, userId: number | null, action: string, oldStatus: string | null, newStatus: string | null, notes: string | null = null) {
  await db.prepare(
    "INSERT INTO case_events (case_id, user_id, action, old_status, new_status, notes) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(caseId, userId, action, oldStatus, newStatus, notes).run();
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

  const vehicleTypeIdRaw = formData.get("vehicle_type_id");
  const vehicleTypeId = vehicleTypeIdRaw ? Number(vehicleTypeIdRaw) : null;
  if (!vehicleTypeId) {
    return c.json({ detail: "vehicle_type_id ist ein Pflichtfeld" }, 400);
  }
  const vehicleType = await c.env.DB.prepare(
    "SELECT number, name FROM vehicle_types WHERE id = ? AND is_active = 1"
  ).bind(vehicleTypeId).first<{ number: string; name: string }>();
  if (!vehicleType) {
    return c.json({ detail: "Fahrzeugtyp nicht gefunden oder inaktiv" }, 400);
  }

  const violationIdRaw = formData.get("violation_id");
  const violationId = violationIdRaw ? Number(violationIdRaw) : null;

  // Snapshot violation fields
  let violationCode: string | null = null;
  let violationDescription: string | null = null;
  let violationFeeOverride: number | null = null;
  if (violationId) {
    const violation = await c.env.DB.prepare(
      "SELECT code, description, fee_override FROM violations WHERE id = ?"
    ).bind(violationId).first<{ code: string; description: string; fee_override: number | null }>();
    if (violation) {
      violationCode = violation.code;
      violationDescription = violation.description;
      violationFeeOverride = violation.fee_override;
    }
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

  const shiftIdRaw = formData.get("shift_id");
  const shiftId = shiftIdRaw ? Number(shiftIdRaw) : null;

  // Load fee settings for stage timestamps
  const feeSettingsRows = await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('fee_offer', 'fee_full', 'fee_holder_surcharge')"
  ).all<{ key: string; value: string }>();
  const _feeSettings = Object.fromEntries(feeSettingsRows.results.map((r) => [r.key, Number(r.value)]));

  const reportedAtDate = new Date(reportedAt);
  const offerExpiresAt = addWorkdays(reportedAtDate, 3);
  const stage2DueAt = addWorkdays(new Date(offerExpiresAt * 1000), 7);

  const result = await c.env.DB.prepare(
    `INSERT INTO cases (location_id, license_plate, reported_at, notes, status, case_type,
     payment_deadline, recall_deadline, reported_by_user_id, shift_id,
     offer_expires_at, stage_2_due_at, current_fee_stage, violation_id,
     vehicle_type_number, vehicle_type_name, violation_code, violation_description, violation_fee_override)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
  ).bind(locationId, licensePlate, reportedAt, notes || null, initialStatus, caseType,
    paymentDeadline, recallDeadline, user.id, shiftId,
    offerExpiresAt, stage2DueAt, violationId,
    vehicleType.number, vehicleType.name, violationCode, violationDescription, violationFeeOverride).run();

  const caseId = result.meta.last_row_id as number;

  if (shiftId) {
    await c.env.DB.prepare(
      "UPDATE shifts SET case_count = case_count + 1 WHERE id = ?"
    ).bind(shiftId).run();
  }

  await logEvent(c.env.DB, caseId, user.id, "created", null, initialStatus, null);

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

  const body = await c.req.json<{ status: string; ticket_number?: string; notes?: string; paid_amount?: number }>();
  const { status, ticket_number, notes } = body;
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
  if (status === "closed") {
    updates.push("closed_at = ?"); values.push(new Date().toISOString());
    updates.push("closed_reason = ?"); values.push("manual");
  }
  if (status === "second_chance") {
    if (!ca.recall_deadline || new Date(ca.recall_deadline) <= new Date()) {
      return c.json({ detail: "Widerrufsfrist abgelaufen" }, 400);
    }
  }
  if (status === "paid") {
    if (body.paid_amount === undefined || body.paid_amount === null) {
      return c.json({ detail: "paid_amount ist ein Pflichtfeld beim Bezahlen" }, 400);
    }
    const nowIso = new Date().toISOString();
    updates.push("paid_at = ?"); values.push(nowIso);
    updates.push("paid_amount = ?"); values.push(body.paid_amount);
  }

  values.push(id);
  await c.env.DB.prepare(`UPDATE cases SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values).run();

  // Record case_fees snapshot on payment
  if (status === "paid" && body.paid_amount != null) {
    const nowTs = Math.floor(Date.now() / 1000);
    const stage = ca.current_fee_stage ?? 0;
    await c.env.DB.prepare(
      "INSERT INTO case_fees (case_id, stage, amount, label, recorded_at, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, stage, body.paid_amount, "Zahlung", nowTs, user.id).run();
  }

  await logEvent(c.env.DB, id, user.id, "status_changed", ca.status, status, notes || null);

  return c.json({ ok: true });
});

// PATCH /:id/fee-stage — update current fee stage (admin only)
cases.patch("/:id/fee-stage", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const ca = await c.env.DB.prepare("SELECT id, location_id FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, c.get("user"), ca.location_id))) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }
  const { stage } = await c.req.json<{ stage: number }>();
  if (stage === undefined || stage < 0 || stage > 99) {
    return c.json({ detail: "Ungültige Stufe" }, 400);
  }
  await c.env.DB.prepare("UPDATE cases SET current_fee_stage = ? WHERE id = ?").bind(stage, id).run();
  return c.json({ ok: true });
});

cases.patch("/:id/owner", requireAdminOrBuchhaltung, async (c) => {
  const id = Number(c.req.param("id"));
  const ca = await c.env.DB.prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, c.get("user"), ca.location_id))) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }

  const { owner_first_name, owner_last_name, owner_street, owner_zip, owner_city } = await c.req.json();
  await c.env.DB.prepare(
    `UPDATE cases SET owner_first_name=?, owner_last_name=?, owner_street=?, owner_zip=?, owner_city=? WHERE id=?`
  ).bind(
    owner_first_name ?? null, owner_last_name ?? null,
    owner_street ?? null, owner_zip ?? null, owner_city ?? null, id
  ).run();

  await logEvent(c.env.DB, id, c.get("user").id, "owner_updated", null, null, null);
  return c.json({ ok: true });
});

// PATCH /:id/vehicle-type — Admin kann Fahrzeugtyp an bestehendem Fall ändern
cases.patch("/:id/vehicle-type", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const ca = await c.env.DB.prepare("SELECT id, location_id FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (!(await checkLocationAccess(c.env.DB, c.get("user"), ca.location_id))) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }
  const { vehicle_type_id } = await c.req.json<{ vehicle_type_id: number }>();
  if (!vehicle_type_id) return c.json({ detail: "vehicle_type_id ist erforderlich" }, 400);
  const vt = await c.env.DB.prepare(
    "SELECT number, name FROM vehicle_types WHERE id = ?"
  ).bind(vehicle_type_id).first<{ number: string; name: string }>();
  if (!vt) return c.json({ detail: "Fahrzeugtyp nicht gefunden" }, 404);
  await c.env.DB.prepare(
    "UPDATE cases SET vehicle_type_number = ?, vehicle_type_name = ? WHERE id = ?"
  ).bind(vt.number, vt.name, id).run();
  await logEvent(c.env.DB, id, c.get("user").id, "vehicle_type_changed", null, null, `Fahrzeugtyp: [${vt.number}] ${vt.name}`);
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

  const recalledAt = new Date().toISOString();
  await c.env.DB.prepare(
    "UPDATE cases SET status = 'recalled', recalled_at = ? WHERE id = ?"
  ).bind(recalledAt, id).run();

  await logEvent(c.env.DB, id, user.id, "recalled", ca.status, "recalled", null);

  // Bestätigungs-E-Mail an den meldenden User senden
  c.executionCtx.waitUntil((async () => {
    try {
      const reporter = await c.env.DB.prepare(
        "SELECT email, username FROM users WHERE id = ?"
      ).bind(ca.reported_by_user_id).first<{ email: string; username: string }>();
      const location = await c.env.DB.prepare(
        "SELECT name FROM locations WHERE id = ?"
      ).bind(ca.location_id).first<{ name: string }>();
      if (reporter?.email) {
        const recalledAtFormatted = new Date(recalledAt).toLocaleString("de-DE", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        await sendRecallConfirmationEmail(
          c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME,
          reporter.email, reporter.username,
          ca.license_plate, location?.name ?? "Unbekannt", recalledAtFormatted
        );
      }
    } catch {
      // E-Mail-Fehler soll den Widerruf nicht blockieren
    }
  })());

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

  await logEvent(c.env.DB, id, user.id, "deleted", ca.status, null, null);

  // Delete images from R2
  const images = await c.env.DB.prepare("SELECT filename FROM case_images WHERE case_id = ?")
    .bind(id).all<{ filename: string }>();
  await Promise.all(images.results.map((img) => c.env.UPLOADS.delete(img.filename)));

  await c.env.DB.prepare("DELETE FROM cases WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// Manuelles Anonymisieren (Admin only)
cases.post("/:id/anonymize", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const ca = await c.env.DB.prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<Case>();
  if (!ca) return c.json({ detail: "Fall nicht gefunden" }, 404);
  if (ca.anonymized_at) return c.json({ detail: "Fall wurde bereits anonymisiert" }, 400);

  const nowIso = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE cases SET license_plate='XX XX 111', owner_first_name='Falsch', owner_last_name='Parker',
     owner_street=NULL, owner_zip=NULL, anonymized_at=? WHERE id=?`
  ).bind(nowIso, id).run();

  const images = await c.env.DB.prepare("SELECT filename FROM case_images WHERE case_id = ?")
    .bind(id).all<{ filename: string }>();
  await Promise.all(images.results.map((img) => c.env.UPLOADS.delete(img.filename)));
  await c.env.DB.prepare("DELETE FROM case_images WHERE case_id = ?").bind(id).run();

  await logEvent(c.env.DB, id, c.get("user").id, "anonymized", null, null, null);
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

// POST /second-chance-request — requireAuth (self_control and admin roles)
cases.post("/second-chance-request", async (c) => {
  const user = c.get("user");

  const isSelfControl = ["self_control_business", "self_control_private"].includes(user.role);
  const isAdmin = user.role === "admin";
  if (!isSelfControl && !isAdmin) {
    return c.json({ detail: "Kein Zugriff" }, 403);
  }

  const data = await c.req.json<{ license_plate: string; location_id: number }>();
  const { license_plate, location_id } = data;

  if (!license_plate || !location_id) {
    return c.json({ detail: "license_plate und location_id sind Pflichtfelder" }, 400);
  }

  // Check location access
  if (!(await checkLocationAccess(c.env.DB, user, location_id))) {
    return c.json({ detail: "Kein Zugriff auf diesen Standort" }, 403);
  }

  const normalizedPlate = license_plate.toUpperCase().trim();

  // Search for a matching case in the last 24 hours
  const found = await c.env.DB.prepare(
    `SELECT * FROM cases
     WHERE license_plate = ? AND location_id = ?
       AND reported_at >= datetime('now', '-24 hours')
       AND status NOT IN ('closed','paid','recalled','second_chance','abandoned')
     ORDER BY reported_at DESC
     LIMIT 1`
  ).bind(normalizedPlate, location_id).first<Case>();

  if (found) {
    // Update case status to second_chance
    await c.env.DB.prepare(
      "UPDATE cases SET status = 'second_chance' WHERE id = ?"
    ).bind(found.id).run();

    // Log event
    await logEvent(c.env.DB, found.id, user.id, "status_changed", found.status, "second_chance", null);

    // Send admin notification
    c.executionCtx.waitUntil(
      sendAdminNotification(
        c.env,
        c.env.DB,
        `Second Chance Anfrage: Kennzeichen ${normalizedPlate} — Fall #${found.id}`,
        `Betreiber ${user.username} hat für Kennzeichen ${normalizedPlate} an Standort ${location_id} einen Second Chance beantragt. Fall #${found.id} wurde automatisch auf 'Second Chance' gesetzt.`
      )
    );

    return c.json({ found: true, case_id: found.id });
  } else {
    // Not found — notify admin anyway
    c.executionCtx.waitUntil(
      sendAdminNotification(
        c.env,
        c.env.DB,
        `Second Chance Anfrage: Kennzeichen ${normalizedPlate} — nicht gefunden`,
        `Betreiber ${user.username} hat für Kennzeichen ${normalizedPlate} einen Second Chance beantragt, aber es wurde kein passender Fall in den letzten 24 Stunden gefunden. Bitte manuell prüfen.`
      )
    );

    return c.json({ found: false });
  }
});

export default cases;
