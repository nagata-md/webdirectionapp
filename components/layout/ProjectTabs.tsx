"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const tabs = [
    { label: "基本情報", href: base },
    { label: "ディレクトリマップ", href: `${base}/directory-map` },
    { label: "スケジュール", href: `${base}/schedule` },
    { label: "見積もり", href: `${base}/estimate` },
    { label: "メタ情報", href: `${base}/meta` },
  ];

  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive =
          tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-[13px] font-semibold ${
              isActive
                ? "border-accent text-navy"
                : "border-transparent text-muted hover:no-underline"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
