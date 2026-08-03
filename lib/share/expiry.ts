// 共有リンクの有効期限判定（spec §4.10）。Reactコンポーネントのレンダー内で
// Date.now()を直接呼ぶとreact-hooks/purityに抵触するため、ヘルパーに切り出す。
export function isShareLinkExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}
