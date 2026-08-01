import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        title="プロジェクト"
        eyebrow="PROJECTS"
        actions={<Button variant="primary">＋ 新規プロジェクト</Button>}
      />
      <Panel>
        <p className="text-muted">
          プロジェクトの一覧・作成・切替はPhase 5（プロジェクト管理・基本情報）で実装します。
        </p>
      </Panel>
    </div>
  );
}
