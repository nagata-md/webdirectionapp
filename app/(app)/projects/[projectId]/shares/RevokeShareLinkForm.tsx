"use client";

import { Button } from "@/components/ui/Button";
import { revokeShareLink } from "./actions";

export function RevokeShareLinkForm({ projectId, shareId }: { projectId: string; shareId: string }) {
  return (
    <form
      action={revokeShareLink}
      onSubmit={(e) => {
        if (!confirm("この共有リンクを失効させますか？")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} readOnly />
      <input type="hidden" name="shareId" value={shareId} readOnly />
      <Button type="submit" variant="danger">
        失効させる
      </Button>
    </form>
  );
}
