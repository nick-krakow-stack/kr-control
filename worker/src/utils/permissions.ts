import { ALL_PERMISSIONS, PermissionKey } from "../types";

export async function getEffectivePermissions(
  db: D1Database,
  userId: number
): Promise<Set<PermissionKey>> {
  const rows = await db.prepare(`
    SELECT DISTINCT gp.permission
    FROM user_groups ug
    JOIN group_permissions gp ON gp.group_id = ug.group_id
    WHERE ug.user_id = ?
  `).bind(userId).all<{ permission: string }>();
  return new Set(rows.results.map((r) => r.permission as PermissionKey));
}

export async function hasPermission(
  db: D1Database,
  userId: number,
  permission: PermissionKey
): Promise<boolean> {
  const perms = await getEffectivePermissions(db, userId);
  return perms.has(permission);
}

export async function getCustomerPermissions(
  db: D1Database,
  customerId: number
): Promise<Set<PermissionKey>> {
  const rows = await db.prepare(
    "SELECT permission FROM customer_permissions WHERE customer_id = ?"
  ).bind(customerId).all<{ permission: string }>();
  return new Set(rows.results.map((r) => r.permission as PermissionKey));
}
