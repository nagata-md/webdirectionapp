import { Panel, SectionLabel } from "@/components/ui/Panel";

type Owner = { role: string; name: string };
type ProjectLink = { category: string; label: string; url: string };

function LinkList({ links }: { links: ProjectLink[] }) {
  if (links.length === 0) {
    return <p className="text-[13px] text-subtle">登録されていません</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5 text-[13px]">
      {links.map((link, i) => (
        <li key={i}>
          <span className="font-semibold">{link.label}</span>{" "}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy underline"
          >
            {link.url}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ShareBasicInfoView({
  projectName,
  clientName,
  startDate,
  full,
  owners,
  serverLinks,
  figmaLinks,
}: {
  projectName: string;
  clientName: string | null;
  startDate: string | null;
  full: boolean;
  owners: Owner[];
  serverLinks: ProjectLink[];
  figmaLinks: ProjectLink[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionLabel>基本情報</SectionLabel>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] md:grid-cols-3">
          <div>
            <div className="mb-1 text-[12px] font-semibold text-muted">プロジェクト名</div>
            {projectName}
          </div>
          <div>
            <div className="mb-1 text-[12px] font-semibold text-muted">クライアント名</div>
            {clientName ?? "-"}
          </div>
          <div>
            <div className="mb-1 text-[12px] font-semibold text-muted">着手日</div>
            {startDate ?? "-"}
          </div>
        </div>
      </Panel>

      {full && (
        <>
          <Panel>
            <SectionLabel>自社担当者</SectionLabel>
            {owners.length === 0 ? (
              <p className="text-[13px] text-subtle">登録されていません</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[13px]">
                {owners.map((owner, i) => (
                  <li key={i}>
                    <span className="text-muted">{owner.role}</span>：{owner.name}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <SectionLabel>サーバー情報リンク</SectionLabel>
            <LinkList links={serverLinks} />
          </Panel>

          <Panel>
            <SectionLabel>Figmaリンク</SectionLabel>
            <LinkList links={figmaLinks} />
          </Panel>
        </>
      )}
    </div>
  );
}
