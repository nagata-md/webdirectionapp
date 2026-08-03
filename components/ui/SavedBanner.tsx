"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// 保存系Server Actionはすべて `?saved=1` を付けてredirectする。
// このバナーがそれを検知して「保存しました」を一時的に表示し、URLから消す。
export function SavedBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const saved = searchParams.get("saved");

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => {
      router.replace(pathname);
    }, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  if (!saved) return null;

  return (
    <div className="mb-4 rounded-control border border-accent bg-accent-tint px-3 py-2 text-[13px] font-semibold text-accent">
      ✓ 保存しました
    </div>
  );
}
