import { describe, expect, it } from "vitest";
import { comparePageSiblings, pageDepthPrefix, sortPagesAsTree } from "../constants";

describe("sortPagesAsTree", () => {
  it("親→子をたどるDFS順にフラット化し、見積もり・ガントチャートの項目順序をディレクトリマップと一致させる", () => {
    const pages = [
      { id: "b", parent_id: null, priority: 2, name: "B" },
      { id: "a", parent_id: null, priority: 1, name: "A" },
      { id: "a-2", parent_id: "a", priority: 2, name: "A-2" },
      { id: "a-1", parent_id: "a", priority: 1, name: "A-1" },
      { id: "b-1", parent_id: "b", priority: 1, name: "B-1" },
    ];

    const order = sortPagesAsTree(pages).map((p) => p.id);

    // A(1) -> その子A-1,A-2 -> B(2) -> その子B-1、というツリー表示順と一致する
    expect(order).toEqual(["a", "a-1", "a-2", "b", "b-1"]);
  });

  it("同一priorityの場合はページ名で安定的にタイブレークする", () => {
    const pages = [
      { id: "z", parent_id: null, priority: 1, name: "Zebra" },
      { id: "a", parent_id: null, priority: 1, name: "Apple" },
    ];

    expect(sortPagesAsTree(pages).map((p) => p.id)).toEqual(["a", "z"]);
  });

  it("進行グループには依存せず、priority（ドラッグ&ドロップ）のみで並ぶ（2026-08-07再確定）", () => {
    // 進行グループはスケジュールの起点を揃えるための分類であり、表示順とは無関係。
    // 異なる進行グループに属するページが混在していても、priorityの昇順がそのまま表示順になる。
    const pages = [
      { id: "company", parent_id: null, priority: 1, name: "会社案内" }, // group: 概要関連ページ
      { id: "design", parent_id: null, priority: 2, name: "デザイン" }, // group: 主要ページ1
      { id: "reform", parent_id: null, priority: 3, name: "リフォーム営業" }, // group: 概要関連ページ
    ];

    const order = sortPagesAsTree(pages).map((p) => p.id);
    expect(order).toEqual(["company", "design", "reform"]);
  });
});

describe("comparePageSiblings", () => {
  it("priority昇順、同値ならページ名で比較する", () => {
    const a = { priority: 2, name: "B" };
    const b = { priority: 1, name: "A" };
    expect(comparePageSiblings(a, b)).toBeGreaterThan(0);
    expect(comparePageSiblings(b, a)).toBeLessThan(0);
  });
});

describe("pageDepthPrefix", () => {
  it("ルートページ(depth=0)には何も付けない", () => {
    expect(pageDepthPrefix(0)).toBe("");
  });

  it("depthに応じて「ー」を繰り返し、末尾に半角スペースを付ける", () => {
    expect(pageDepthPrefix(1)).toBe("ー ");
    expect(pageDepthPrefix(2)).toBe("ーー ");
    expect(pageDepthPrefix(3)).toBe("ーーー ");
  });
});
