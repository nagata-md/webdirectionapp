import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectTabs } from "@/components/layout/ProjectTabs";
import { SavedBanner } from "@/components/ui/SavedBanner";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, project_name")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={project.project_name} eyebrow="PROJECT" />
      <ProjectTabs projectId={project.id} />
      <Suspense fallback={null}>
        <SavedBanner />
      </Suspense>
      {children}
    </div>
  );
}
