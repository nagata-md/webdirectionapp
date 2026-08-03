import crypto from "node:crypto";

// パスワード照合済みであることを示すCookieの値を計算する。
// サーバーのみが知る鍵からHMACを算出するため、クライアントが値を推測して
// 偽造することはできない（トークン自体も推測不可能なランダム値であることと合わせた多層防御）。
function computeMarker(token: string): string {
  const secret = process.env.MASTER_ENCRYPTION_KEY ?? "";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export function sharePasswordCookieName(token: string): string {
  return `share_pw_${token}`;
}

export function sharePasswordCookieValue(token: string): string {
  return computeMarker(token);
}

export function isSharePasswordVerified(token: string, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return cookieValue === computeMarker(token);
}
