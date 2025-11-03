// lib/crypto/token-crypto.ts
import crypto from "node:crypto";

const secret = process.env.TOKEN_ENC_KEY;
if (!secret) throw new Error("TOKEN_ENC_KEY must be set");

const KEY = crypto.createHash("sha256").update(secret, "utf8").digest(); // 32 bytes

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${ct.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptToken(payload: string): string {
  const [ivB64, ctB64, tagB64] = payload.split(":");
  if (!ivB64 || !ctB64 || !tagB64) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

// rétro-compat: si la valeur n’est pas chiffrée, on renvoie telle quelle
export function maybeDecrypt(payload?: string | null): string | null {
  if (!payload) return null;
  try { return decryptToken(payload); } catch { return payload; }
}
