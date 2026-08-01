import Link from "next/link";

const navItems = [{ label: "プロジェクト", href: "/projects" }, { label: "マスタ設定", href: "/master" }];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-navy p-6 text-white md:p-6">
      <div className="mb-6">
        <div className="font-label text-lg font-bold tracking-[0.06em] text-white">
          制作進行オートメーター
        </div>
      </div>
      <ul className="mb-6 list-none space-y-0.5 border-t border-white/10 pt-3 pl-0">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-control border-l-[3px] border-transparent px-2.5 py-2 text-[13px] text-white/80 hover:bg-white/[0.06] hover:no-underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      {userEmail && (
        <div className="border-t border-white/10 pt-3 text-xs">
          <div className="text-white">{userEmail}</div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="mt-2 inline-block text-white/70 hover:no-underline">
              ログアウト
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
