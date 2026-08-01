import { type ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-navy">
      <div className="w-full max-w-[360px] rounded-panel bg-white p-9 text-center shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
        <div className="mb-1.5 font-label text-[22px] font-bold tracking-[0.06em] text-navy">
          制作進行オートメーター
        </div>
        {children}
      </div>
    </div>
  );
}
