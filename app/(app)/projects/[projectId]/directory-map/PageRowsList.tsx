"use client";

import { useState } from "react";
import { PageRow } from "./PageRow";
import { comparePageSiblings, type PageNode, type ProgressGroup } from "@/lib/pages/constants";

// 兄弟ページ（同じparent_id）の範囲内でのドラッグ&ドロップ並び替え（2026-08-07新規要件）。
// このコンポーネント自身が「1つの兄弟グループ」を表し、自分の子ページ用に自分自身を再帰的に
// 描画する。ドラッグ対象は常にこのグループ内のIDのみを送るため、親子階層はセットで動く
// （子ページは常にPageRowの内側にネストして描画されるため、親を動かせば子も一緒についてくる）。
export function PageRowsList({
  parentId,
  depth,
  allPages,
  groups,
  projectId,
  onReorder,
}: {
  parentId: string | null;
  depth: number;
  allPages: PageNode[];
  groups: ProgressGroup[];
  projectId: string;
  onReorder: (parentId: string | null, orderedIds: string[]) => void;
}) {
  const siblings = allPages.filter((p) => p.parent_id === parentId).sort(comparePageSiblings);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (draggingId && draggingId !== targetId) {
      const ids = siblings.map((s) => s.id);
      const from = ids.indexOf(draggingId);
      const to = ids.indexOf(targetId);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        onReorder(parentId, ids);
      }
    }
    setDraggingId(null);
    setOverId(null);
  }

  return (
    <>
      {siblings.map((page) => (
        <div
          key={page.id}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggingId && draggingId !== page.id) setOverId(page.id);
          }}
          onDragLeave={() => setOverId((cur) => (cur === page.id ? null : cur))}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrop(page.id);
          }}
          className={
            overId === page.id
              ? "rounded-control outline outline-2 outline-accent outline-offset-[-2px]"
              : ""
          }
        >
          <PageRow
            page={page}
            depth={depth}
            allPages={allPages}
            groups={groups}
            projectId={projectId}
            isDragging={draggingId === page.id}
            dragHandleProps={{
              draggable: true,
              onDragStart: (e) => {
                e.stopPropagation();
                e.dataTransfer.setData("text/plain", page.id);
                e.dataTransfer.effectAllowed = "move";
                setDraggingId(page.id);
              },
              onDragEnd: (e) => {
                e.stopPropagation();
                setDraggingId(null);
                setOverId(null);
              },
            }}
          />
          <PageRowsList
            parentId={page.id}
            depth={depth + 1}
            allPages={allPages}
            groups={groups}
            projectId={projectId}
            onReorder={onReorder}
          />
        </div>
      ))}
    </>
  );
}
