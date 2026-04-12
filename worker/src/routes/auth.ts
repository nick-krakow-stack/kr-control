import { Hono } from "hono";
import { Env, User } from "../types";
import { hashPassword, verifyPassword, createAccessToken, verifyToken } from "../auth";
import { authMiddleware } from "../middleware";
import { sendPasswordChangedEmail, sendPasswordResetEmail } from "../email";
import { SignJWT } from "jose";
import { getEffectivePermissions } from "../utils/permissions";

const auth = new Hono<{ Bindings: Env; Variables: { user: User } }>();

auth.post("/login", async (c) => {
  const contentType = c.req.header("Content-Type") || "";
  let username: string, password: string;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await c.req.formData();
    username = (body.get("username") as string) || "";
    password = (body.get("password") as string) || "";
  } else {
    const body = await c.req.json();
    username = body.username || "";
    password = body.password || "";
  }

  if (!username || !password) {
    return c.json({ detail: "Benutzername und Passwort erforderlich" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE username = ? AND is_active = 1"
  ).bind(username).first<User>();

  if (!user || !user.hashed_password || !verifyPassword(password, user.hashed_password)) {
    return c.json({ detail: "Benutzername oder Passwort falsch" }, 401);
  }

  const expireMinutes = Number(c.env.ACCESS_TOKEN_EXPIRE_MINUTES) || 1440;
  const token = await createAccessToken(user.id, c.env.SECRET_KEY, expireMinutes);
  return c.json({ access_token: token, token_type: "bearer" });
});

auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    recall_hours: user.recall_hours,
  });
});

auth.get("/me/permissions", authMiddleware, async (c) => {
  const user = c.get("user");
  // Admin always has all permissions
  if (user.role === "admin") {
    const { ALL_PERMISSIONS } = await import("../types");
    return c.json({ permissions: Object.keys(ALL_PERMISSIONS) });
  }
  const perms = await getEffectivePermissions(c.env.DB, user.id);
  return c.json({ permissions: [...perms] });
});

auth.post("/setup-password", async (c) => {
  const { token, password } = await c.req.json();
  if (!token || !password) {
    return c.json({ detail: "Token und Passwort erforderlich" }, 400);
  }
  if (password.length < 8) {
    return c.json({ detail: "Passwort muss mindestens 8 Zeichen haben" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE invite_token = ?"
  ).bind(token).first<User>();

  if (!user) return c.json({ detail: "Token ungültig" }, 400);
  if (user.invite_expires_at && new Date(user.invite_expires_at) < new Date()) {
    return c.json({ detail: "Token abgelaufen – bitte Administrator kontaktieren" }, 400);
  }

  const hashed = await hashPassword(password);
  await c.env.DB.prepare(
    "UPDATE users SET hashed_password = ?, email_verified = 1, invite_token = NULL, invite_expires_at = NULL WHERE id = ?"
  ).bind(hashed, user.id).run();

  c.executionCtx.waitUntil(
    sendPasswordChangedEmail(c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME, user.email, user.username)
  );

  return c.json({ ok: true });
});

auth.post("/change-password", authMiddleware, async (c) => {
  const user = c.get("user");
  const { old_password, new_password } = await c.req.json();

  if (!user.hashed_password || !verifyPassword(old_password, user.hashed_password)) {
    return c.json({ detail: "Aktuelles Passwort ist falsch" }, 400);
  }
  if (!new_password || new_password.length < 8) {
    return c.json({ detail: "Neues Passwort muss mindestens 8 Zeichen haben" }, 400);
  }

  const hashed = await hashPassword(new_password);
  await c.env.DB.prepare(
    "UPDATE users SET hashed_password = ? WHERE id = ?"
  ).bind(hashed, user.id).run();

  c.executionCtx.waitUntil(
    sendPasswordChangedEmail(c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME, user.email, user.username)
  );

  return c.json({ ok: true });
});

auth.post("/forgot-password", async (c) => {
  const { email } = await c.req.json();
  // Immer 200 zurückgeben – User-Enumeration verhindern
  if (!email) return c.json({ ok: true });

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE email = ? AND is_active = 1"
  ).bind(email).first<User>();

  if (user) {
    const secret = new TextEncoder().encode(c.env.SECRET_KEY);
    const resetToken = await new SignJWT({
      sub: String(user.id),
      purpose: "reset",
      pw: user.hashed_password?.slice(0, 8) ?? "",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    c.executionCtx.waitUntil(
      sendPasswordResetEmail(
        c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME,
        c.env.FRONTEND_URL, user.email, user.username, resetToken
      )
    );
  }

  return c.json({ ok: true });
});

auth.post("/reset-password", async (c) => {
  const { token, password } = await c.req.json();
  if (!token || !password) {
    return c.json({ detail: "Token und Passwort erforderlich" }, 400);
  }
  if (password.length < 8) {
    return c.json({ detail: "Passwort muss mindestens 8 Zeichen haben" }, 400);
  }

  const payload = await verifyToken(token, c.env.SECRET_KEY);
  if (!payload || (payload as { purpose?: string }).purpose !== "reset") {
    return c.json({ detail: "Token ungültig oder abgelaufen" }, 400);
  }

  const userId = Number(payload.sub);
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ? AND is_active = 1"
  ).bind(userId).first<User>();

  if (!user) {
    return c.json({ detail: "Benutzer nicht gefunden" }, 400);
  }

  // Prüfen ob Token noch gültig (Passwort wurde zwischenzeitlich nicht geändert)
  const payloadPw = (payload as { pw?: string }).pw ?? "";
  if ((user.hashed_password?.slice(0, 8) ?? "") !== payloadPw) {
    return c.json({ detail: "Token bereits verwendet oder abgelaufen" }, 400);
  }

  const hashed = await hashPassword(password);
  await c.env.DB.prepare(
    "UPDATE users SET hashed_password = ? WHERE id = ?"
  ).bind(hashed, user.id).run();

  c.executionCtx.waitUntil(
    sendPasswordChangedEmail(c.env.RESEND_API_KEY, c.env.SMTP_FROM, c.env.SMTP_FROM_NAME, user.email, user.username)
  );

  return c.json({ ok: true });
});

export default auth;
