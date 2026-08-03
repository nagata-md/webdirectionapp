"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ShareLinkSections } from "@/lib/share/getShareLinkStatus";

export function ShareTabs({ token, sections }: { token: string; sections: ShareLinkSections }) {
  const pathname = usePathname();
  const base = `/share/${token}`;

  const showBasicInfo = sections.basicInfoPublic || sections.basicInfoFull;

  const allTabs = [
    { key: "basicInfo", label: "基本情報", href: `${base}/basic-info`, show: showBasicInfo },
    { key: "directoryMap", label: "ディレクトリマップ", href: `${base}/directory-map`, show: sections.directoryMap },
    { key: "schedule", label: "スケジュール", href: `${base}/schedule`, show: sections.schedule },
    { key: "estimate", label: "見積もり", href: `${base}/estimate`, show: sections.estimate },
    { key: "meta", label: "メタ情報", href: `${base}/meta`, show: sections.meta },
  ] as const;

  const tabs = allTabs.filter((tab) => tab.show);

  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
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
