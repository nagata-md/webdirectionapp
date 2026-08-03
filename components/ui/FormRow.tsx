import { type ReactNode } from "react";

export function FormRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-semibold text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
