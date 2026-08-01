import { type ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  actions,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-2.5">
      <h1 className="border-l-4 border-accent pl-2.5 text-xl">{title}</h1>
      {eyebrow && (
        <span className="font-label text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">
          {eyebrow}
        </span>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
