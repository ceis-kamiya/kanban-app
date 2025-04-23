// src/app/projects/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import ProjectPageClient from "@/components/ProjectPageClient";
import type { Project, Task } from "@/types";

interface Params {
  params: { id: string };
}

export default async function ProjectPage({ params }: Params) {
  const projectId = params.id;

  // プロジェクトをサーバーサイドで取得
  const projectRecord = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!projectRecord) {
    return <div className="p-4">プロジェクトが見つかりません（ID: {projectId}）</div>;
  }

  // タスクをサーバーサイドで取得
  const taskRecords = await prisma.task.findMany({
    where: { projectId },
    orderBy: { dueDate: "asc" },
  });

  // クライアントコンポーネントに渡すデータ整形
  const projects: Project[] = [
    {
      id: projectRecord.id,
      name: projectRecord.name,
      projectManager: projectRecord.projectManager,
    },
  ];
  const initialTasks: Task[] = taskRecords.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    dueDate: t.dueDate.toISOString(),
    assignee: t.assignee,
    tags: t.tags,
    status: t.status,
  }));

  return (
    <ProjectPageClient
      projects={projects}
      initialTasks={initialTasks}
      projectId={projectId}
    />
  );
}
