"use client";

import { useState } from "react";
import { saveProjectLinks } from "../actions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { onEnterKey } from "@/lib/ui/onEnterKey";

type Link = { label: string; url: string };

export function ProjectLinksEditor({
  projectId,
  category,
  initialLinks,
}: {
  projectId: string;
  category: "server" | "figma";
  initialLinks: Link[];
}) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const addLink = () => {
    if (!label.trim() || !url.trim()) return;
    setLinks((prev) => [...prev, { label: label.trim(), url: url.trim() }]);
    setLabel("");
    setUrl("");
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={saveProjectLinks}>
      <input type="hidden" name="projectId" value={projectId} readOnly />
      <input type="hidden" name="category" value={category} readOnly />
      <input type="hidden" name="links" value={JSON.stringify(links)} readOnly />

      <div className="mb-2 flex flex-col gap-1.5">
        {links.length === 0 && (
          <span className="text-[13px] text-subtle">リンクが登録されていません</span>
        )}
        {links.map((l, i) => (
          <div key={`${l.url}-${i}`} className="flex items-center gap-2">
            <Tag onRemove={() => removeLink(i)}>{l.label}</Tag>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[13px] text-navy"
            >
              {l.url}
            </a>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="ラベル（例: 本番URL）"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={onEnterKey(addLink)}
          className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onEnterKey(addLink)}
          className="w-64 rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <Button type="button" onClick={addLink}>
          + 追加
        </Button>
      </div>

      <Button type="submit" variant="primary">
        保存
      </Button>
    </form>
  );
}
