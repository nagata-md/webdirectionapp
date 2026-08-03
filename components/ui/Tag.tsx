import { type ReactNode } from "react";

export function Tag({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-border bg-white px-1.5 py-0.5 text-[11.5px] text-ink">
      <span className="inline-block h-1.5 w-1.5 rounded-[1px] bg-accent" />
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="削除"
          className="ml-0.5 text-subtle hover:text-danger"
        >
          ×
        </button>
      )}
    </span>
  );
}
