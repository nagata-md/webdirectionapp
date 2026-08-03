"use client";

import { useSearchParams } from "next/navigation";

// layout.tsxはsearchParamsを受け取れないため、クライアント側でエラー表示の要否を判定する
export function PasswordErrorNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "1") return null;
  return <p className="text-[13px] text-danger">パスワードが違います。</p>;
}
