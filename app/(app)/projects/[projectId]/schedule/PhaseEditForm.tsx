"use client";

import { overridePhase, resetPhaseOverride } from "./actions";
import { Button } from "@/components/ui/Button";
import type { PhaseSchedule } from "@/lib/schedule/types";

export function PhaseEditForm({
  projectId,
  pageId,
  pageName,
  phaseSchedule,
  onClose,
}: {
  projectId: string;
  pageId: string;
  pageName: string;
  phaseSchedule: PhaseSchedule;
  onClose: () => void;
}) {
  return (
    <div className="mb-2 rounded-panel border border-border-strong bg-surface-subtle p-3">
      <div className="mb-2 text-[13px] font-semibold">
        {pageName} — {phaseSchedule.phase}
        {phaseSchedule.isOverridden && (
          <span className="ml-2 rounded bg-accent-tint px-1.5 py-0.5 text-[11px] text-accent">
            手動オーバーライド中
          </span>
        )}
      </div>

      <form action={overridePhase} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="projectId" value={projectId} readOnly />
        <input type="hidden" name="pageId" value={pageId} readOnly />
        <input type="hidden" name="phaseKey" value={phaseSchedule.phase} readOnly />

        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted">開始日</label>
          <input
            type="date"
            name="overrideStart"
            defaultValue={phaseSchedule.start}
            required
            className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted">終了日</label>
          <input
            type="date"
            name="overrideEnd"
            defaultValue={phaseSchedule.end}
            required
            className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
          />
        </div>

        <label className="flex items-center gap-1.5 pb-2 text-[13px]">
          <input type="checkbox" name="cascadeFollowing" />
          後続工程も追従させる（このページの既にオーバーライド済みの後続区間のみ）
        </label>

        {phaseSchedule.phase === "構成" && (
          <div className="w-full text-[13px]">
            <div className="mb-1 font-semibold text-muted">
              次グループ以降の開始日への影響（この変更でグループの完了日が変わる場合）
            </div>
            <label className="mr-4 inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="groupCascadeChoice"
                value="recalculate"
                defaultChecked
              />
              次グループ以降の自動計算区間を再計算する
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="groupCascadeChoice" value="freeze" />
              このページの区間だけ変更する（次グループ以降は今のまま据え置く）
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            保存
          </Button>
          <Button type="button" onClick={onClose}>
            キャンセル
          </Button>
        </div>
      </form>

      {phaseSchedule.isOverridden && (
        <form action={resetPhaseOverride} className="mt-2">
          <input type="hidden" name="projectId" value={projectId} readOnly />
          <input type="hidden" name="pageId" value={pageId} readOnly />
          <input type="hidden" name="phaseKey" value={phaseSchedule.phase} readOnly />
          <Button type="submit" variant="danger">
            この工程のオーバーライドを解除（自動計算に戻す）
          </Button>
        </form>
      )}
    </div>
  );
}
