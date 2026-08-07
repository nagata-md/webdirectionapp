import { describe, expect, it } from "vitest";
import { reorderSiblingPriorities } from "../reorder";

describe("reorderSiblingPriorities", () => {
  it("同じ親を持つ兄弟だけに新しいpriorityを1始まりで割り当てる", () => {
    const pages = [
      { id: "a", parent_id: null },
      { id: "b", parent_id: null },
      { id: "c", parent_id: null },
      { id: "child-of-a", parent_id: "a" },
    ];

    const result = reorderSiblingPriorities(pages, null, ["c", "a", "b"]);

    expect(result.get("c")).toBe(1);
    expect(result.get("a")).toBe(2);
    expect(result.get("b")).toBe(3);
    // 別の親(a)を持つページには影響しない
    expect(result.has("child-of-a")).toBe(false);
  });

  it("orderedIdsに不足があれば元の兄弟順で末尾に補う", () => {
    const pages = [
      { id: "a", parent_id: "p" },
      { id: "b", parent_id: "p" },
      { id: "c", parent_id: "p" },
    ];

    const result = reorderSiblingPriorities(pages, "p", ["b"]);

    expect(result.get("b")).toBe(1);
    expect(result.get("a")).toBe(2);
    expect(result.get("c")).toBe(3);
  });

  it("対象グループに属さないIDが混ざっていても無視する", () => {
    const pages = [
      { id: "a", parent_id: null },
      { id: "b", parent_id: null },
      { id: "other-parent-child", parent_id: "x" },
    ];

    const result = reorderSiblingPriorities(pages, null, ["b", "other-parent-child", "a"]);

    expect(result.get("b")).toBe(1);
    expect(result.get("a")).toBe(2);
    expect(result.has("other-parent-child")).toBe(false);
  });
});
