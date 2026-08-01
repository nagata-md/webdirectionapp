"use client";

import { useState, type ReactNode } from "react";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <div className="flex items-center justify-between bg-navy px-4 py-3.5 md:hidden">
        <div className="font-label text-lg font-bold tracking-[0.06em] text-white">
          制作進行オートメーター
        </div>
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => setNavOpen((open) => !open)}
          className="rounded-control border border-white/30 px-2.5 py-1.5 text-lg text-white"
        >
          ☰
        </button>
      </div>
      <div className={`${navOpen ? "block" : "hidden"} md:block`}>{sidebar}</div>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
