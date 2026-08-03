import crypto from "node:crypto";

// 共有リンクの任意パスワードをsalt付きscryptでハッシュ化する（外部依存を増やさないためNode組み込みcryptoを使う）。
export function hashSharePassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySharePassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const candidateBuf = Buffer.from(candidate, "hex");
  const storedBuf = Buffer.from(hash, "hex");
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}
