import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, SectionLabel } from "@/components/ui/Panel";

export default function MasterPage() {
  return (
    <div>
      <PageHeader title="マスタ設定" eyebrow="MASTER" />
      <Panel>
        <SectionLabel>単価・工数マスタ</SectionLabel>
        <p className="text-muted">
          単価・工数・休日カレンダー・AI連携設定・発行元情報の編集はPhase 4で実装します。
        </p>
      </Panel>
    </div>
  );
}
