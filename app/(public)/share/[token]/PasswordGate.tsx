import { Suspense } from "react";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { verifyShareLinkPassword } from "./actions";
import { PasswordErrorNotice } from "./PasswordErrorNotice";

export function PasswordGate({ token }: { token: string }) {
  return (
    <Panel>
      <SectionLabel>パスワードが必要です</SectionLabel>
      <form action={verifyShareLinkPassword} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} readOnly />
        <input
          type="password"
          name="password"
          placeholder="パスワード"
          autoFocus
          className="w-full max-w-xs rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <Suspense fallback={null}>
          <PasswordErrorNotice />
        </Suspense>
        <div>
          <Button type="submit" variant="primary">
            表示する
          </Button>
        </div>
      </form>
    </Panel>
  );
}
