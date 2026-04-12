import { Hono } from "hono";
import { Env, User, Group, ALL_PERMISSIONS, PermissionKey } from "../types";
import { authMiddleware, requireAdmin } from "../middleware";

const groups = new Hono<{ Bindings: Env; Variables: { user: User } }>();

groups.use("*", authMiddleware, requireAdmin);

// GET / — alle Gruppen mit Permissions und Member-Count
groups.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM groups ORDER BY name ASC"
  ).all<Group>();

  const result = await Promise.all(rows.results.map(async (g) => {
    const perms = await c.env.DB.prepare(
      "SELECT permission FROM group_permissions WHERE group_id = ?"
    ).bind(g.id).all<{ permission: string }>();

    const memberCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as c FROM user_groups WHERE group_id = ?"
    ).bind(g.id).first<{ c: number }>();

    return {
      ...g,
      is_active: g.is_active === 1,
      permissions: perms.results.map((p) => p.permission),
      member_count: memberCount?.c ?? 0,
    };
  }));

  return c.json(result);
});

// POST / — Gruppe erstellen
groups.post("/", async (c) => {
  const data = await c.req.json();
  const { name, description, permissions } = data;

  if (!name?.trim()) {
    return c.json({ detail: "Name ist ein Pflichtfeld" }, 400);
  }

  const validKeys = new Set(Object.keys(ALL_PERMISSIONS));
  const validPerms: string[] = (permissions ?? []).filter((p: string) => validKeys.has(p));

  const existing = await c.env.DB.prepare("SELECT id FROM groups WHERE name = ?")
    .bind(name.trim()).first();
  if (existing) {
    return c.json({ detail: "Gruppenname bereits vergeben" }, 400);
  }

  const result = await c.env.DB.prepare(
    "INSERT INTO groups (name, description, is_active) VALUES (?, ?, 1)"
  ).bind(name.trim(), description ?? null).run();

  const groupId = result.meta.last_row_id as number;

  if (validPerms.length > 0) {
    for (const perm of validPerms) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO group_permissions (group_id, permission) VALUES (?, ?)"
      ).bind(groupId, perm).run();
    }
  }

  const group = await c.env.DB.prepare("SELECT * FROM groups WHERE id = ?")
    .bind(groupId).first<Group>();

  return c.json({
    ...group,
    is_active: group!.is_active === 1,
    permissions: validPerms,
    member_count: 0,
  }, 201);
});

// PATCH /:id — Gruppe bearbeiten
groups.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const group = await c.env.DB.prepare("SELECT * FROM groups WHERE id = ?")
    .bind(id).first<Group>();
  if (!group) return c.json({ detail: "Gruppe nicht gefunden" }, 404);

  const data = await c.req.json();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    const ex = await c.env.DB.prepare("SELECT id FROM groups WHERE name = ? AND id != ?")
      .bind(data.name.trim(), id).first();
    if (ex) return c.json({ detail: "Gruppenname bereits vergeben" }, 400);
    updates.push("name = ?"); values.push(data.name.trim());
  }
  if (data.description !== undefined) {
    updates.push("description = ?"); values.push(data.description);
  }
  if (data.is_active !== undefined) {
    updates.push("is_active = ?"); values.push(data.is_active ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(id);
    await c.env.DB.prepare(`UPDATE groups SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values).run();
  }

  // Update permissions if provided
  if (data.permissions !== undefined) {
    const validKeys = new Set(Object.keys(ALL_PERMISSIONS));
    const validPerms: string[] = (data.permissions as string[]).filter((p) => validKeys.has(p));

    await c.env.DB.prepare("DELETE FROM group_permissions WHERE group_id = ?").bind(id).run();
    for (const perm of validPerms) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO group_permissions (group_id, permission) VALUES (?, ?)"
      ).bind(id, perm).run();
    }
  }

  const updated = await c.env.DB.prepare("SELECT * FROM groups WHERE id = ?")
    .bind(id).first<Group>();
  const perms = await c.env.DB.prepare(
    "SELECT permission FROM group_permissions WHERE group_id = ?"
  ).bind(id).all<{ permission: string }>();
  const memberCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as c FROM user_groups WHERE group_id = ?"
  ).bind(id).first<{ c: number }>();

  return c.json({
    ...updated,
    is_active: updated!.is_active === 1,
    permissions: perms.results.map((p) => p.permission),
    member_count: memberCount?.c ?? 0,
  });
});

// DELETE /:id — Gruppe löschen (nur wenn keine Member)
groups.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const group = await c.env.DB.prepare("SELECT * FROM groups WHERE id = ?")
    .bind(id).first<Group>();
  if (!group) return c.json({ detail: "Gruppe nicht gefunden" }, 404);

  const memberCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as c FROM user_groups WHERE group_id = ?"
  ).bind(id).first<{ c: number }>();

  if ((memberCount?.c ?? 0) > 0) {
    return c.json({ detail: "Gruppe kann nicht gelöscht werden, da noch Benutzer zugewiesen sind" }, 400);
  }

  await c.env.DB.prepare("DELETE FROM group_permissions WHERE group_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM groups WHERE id = ?").bind(id).run();

  return c.json({ ok: true });
});

// GET /:id/members — User-Liste der Gruppe
groups.get("/:id/members", async (c) => {
  const id = Number(c.req.param("id"));
  const group = await c.env.DB.prepare("SELECT id FROM groups WHERE id = ?")
    .bind(id).first();
  if (!group) return c.json({ detail: "Gruppe nicht gefunden" }, 404);

  const members = await c.env.DB.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.is_active
    FROM user_groups ug
    JOIN users u ON u.id = ug.user_id
    WHERE ug.group_id = ?
    ORDER BY u.username ASC
  `).bind(id).all<{ id: number; username: string; email: string; role: string; is_active: number }>();

  return c.json(members.results.map((u) => ({ ...u, is_active: u.is_active === 1 })));
});

export default groups;
