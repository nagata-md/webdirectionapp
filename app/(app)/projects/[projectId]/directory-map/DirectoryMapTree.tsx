"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageRowsList } from "./PageRowsList";
import { reorderPages } from "./actions";
import { reorderSiblingPriorities } from "@/lib/pages/reorder";
import { ROW_GRID_CLASS } from "./gridLayout";
import type { PageNode, ProgressGroup } from "@/lib/pages/constants";

// ページ名・タグ類を列として揃えるヘッダー行（2026-08-07新規要件）。行本体（PageRow）と
// 同じROW_GRID_CLASSを使うことで列幅を一致させる。
function DirectoryMapHeader() {
  return (
    <div
      className={`${ROW_GRID_CLASS} border-b-2 border-navy pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted`}
    >
      <span />
      <span>ページ名</span>
      <span>種別</span>
      <span>複雑度</span>
      <span>ワイヤー</span>
      <span>コピー</span>
      <span>デザイン</span>
      <span>コーディング</span>
      <span>CMS</span>
      <span>スマホ対応</span>
      <span>進行グループ</span>
      <span>操作</span>
    </div>
  );
}

export function DirectoryMapTree({
  projectId,
  initialPages,
  groups,
}: {
  projectId: string;
  initialPages: PageNode[];
  groups: ProgressGroup[];
}) {
  const [pages, setPages] = useState(initialPages);
  // create/update/delete等のServer Action実行後、サーバーから新しいinitialPagesが渡されたら
  // 状態を最新化する（Reactの「propsからstateを導出する」公式パターン。エフェクトは使わず、
  // レンダー中に直接setStateすることで不要な再レンダーの連鎖を避ける）。
  const [prevInitialPages, setPrevInitialPages] = useState(initialPages);
  if (initialPages !== prevInitialPages) {
    setPrevInitialPages(initialPages);
    setPages(initialPages);
  }
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleReorder(parentId: string | null, orderedIds: string[]) {
    setPages((prev) => {
      const newPriorities = reorderSiblingPriorities(prev, parentId, orderedIds);
      return prev.map((p) => {
        const priority = newPriorities.get(p.id);
        return priority === undefined ? p : { ...p, priority };
      });
    });

    startTransition(() => {
      reorderPages(projectId, parentId, orderedIds).catch(() => {
        // 保存に失敗した場合はサーバーの最新状態に合わせて画面を再取得する
        router.refresh();
      });
    });
  }

  const hasRootPages = pages.some((p) => !p.parent_id);
  if (!hasRootPages) {
    return <p className="text-[13px] text-subtle">ページが登録されていません</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <DirectoryMapHeader />
        <PageRowsList
          parentId={null}
          depth={0}
          allPages={pages}
          groups={groups}
          projectId={projectId}
          onReorder={handleReorder}
        />
      </div>
    </div>
  );
}
