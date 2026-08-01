import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";

type Variant = "default" | "primary" | "danger";

const variantClasses: Record<Variant, string> = {
  default: "bg-white text-navy border-border-strong hover:bg-surface",
  primary: "bg-navy text-white border-navy hover:bg-navy-hover",
  danger: "bg-white text-danger border-danger hover:bg-danger-tint",
};

const base =
  "inline-flex items-center gap-1.5 rounded-control border px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-default";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "default", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
};

export function LinkButton({ variant = "default", className = "", ...props }: LinkButtonProps) {
  return (
    <a className={`${base} ${variantClasses[variant]} ${className}`} {...props} />
  );
}
