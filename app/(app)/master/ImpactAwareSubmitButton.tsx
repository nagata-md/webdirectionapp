"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { checkLiveShareImpact } from "./actions";

export function ImpactAwareSubmitButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = e.currentTarget.form;
    if (!form) return;

    startTransition(async () => {
      const impacted = await checkLiveShareImpact();
      if (impacted.length > 0) {
        const names = impacted.map((i) => i.projectName).join("、");
        const ok = window.confirm(
          `この変更は現在有効な${impacted.length}件のライブ共有リンク（見積もり公開中）の表示金額に影響します。\n対象プロジェクト: ${names}\n\n保存を続行しますか？`,
        );
        if (!ok) return;
      }
      form.requestSubmit();
    });
  }

  return (
    <Button type="button" variant="primary" onClick={handleClick} disabled={isPending}>
      {isPending ? "確認中…" : "保存"}
    </Button>
  );
}
