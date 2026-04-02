import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export async function createAccessToken(userId: number, secretKey: string, expireMinutes: number): Promise<string> {
  const secret = new TextEncoder().encode(secretKey);
  const expireDate = new Date(Date.now() + expireMinutes * 60 * 1000);
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expireDate)
    .sign(secret);
}

export async function verifyToken(token: string, secretKey: string): Promise<{ sub: string } | null> {
  try {
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    return payload as { sub: string };
  } catch {
    return null;
  }
}
