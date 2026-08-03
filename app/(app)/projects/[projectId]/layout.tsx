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
    .select("id, project_name, client_name")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={project.project_name} eyebrow="PROJECT" />
      {project.client_name && (
        <p className="-mt-3 mb-4 text-[13px] text-subtle">{project.client_name} 様</p>
      )}
      <ProjectTabs projectId={project.id} />
      <Suspense fallback={null}>
        <SavedBanner />
      </Suspense>
      {children}
    </div>
  );
}
