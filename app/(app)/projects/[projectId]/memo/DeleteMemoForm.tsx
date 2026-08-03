"use client";

import { deleteMemo } from "./actions";
import { Button } from "@/components/ui/Button";

export function DeleteMemoForm({ projectId, memoId }: { projectId: string; memoId: string }) {
  return (
    <form
      action={deleteMemo}
      onSubmit={(e) => {
        if (!confirm("このメモを削除しますか？")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} readOnly />
      <input type="hidden" name="memoId" value={memoId} readOnly />
      <Button type="submit" variant="danger">
        削除
      </Button>
    </form>
  );
}
