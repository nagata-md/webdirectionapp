"use client";

import { archiveProject } from "../actions";
import { Button } from "@/components/ui/Button";

export function ArchiveProjectForm({ projectId }: { projectId: string }) {
  return (
    <form
      action={archiveProject}
      onSubmit={(e) => {
        if (!confirm("このプロジェクトを完了にしますか？一覧から非表示になります（後から取り消せます）。")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} readOnly />
      <Button type="submit">完了にする</Button>
    </form>
  );
}
