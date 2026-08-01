import { type ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-panel border border-border bg-white p-5 shadow-panel ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3.5 inline-block border-b-2 border-accent pb-1 font-label text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">
      {children}
    </div>
  );
}
