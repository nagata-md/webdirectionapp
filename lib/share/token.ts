import crypto from "node:crypto";

// 共有URL用の推測不可能なランダムトークン（spec §4.10）
export function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
