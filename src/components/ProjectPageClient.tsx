// src/components/ProjectPageClient.tsx
"use client";

import React, { useState } from "react";
import { Task, Project } from "@/types";
import { TaskForm } from "@/components/TaskForm";
import { KanbanBoard } from "@/components/KanbanBoard";

interface Props {
  projects: Project[];
  initialTasks: Task[];
  projectId: string;
}

export default function ProjectPageClient({
  projects,
  initialTasks,
  projectId,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleCreated = (t: Task) => {
    if (t.projectId === projectId) {
      setTasks((prev) => [...prev, t]);
    }
  };

  const handleProjectUpdated = (updated: Project) => {
    // プロジェクト更新後の処理（必要に応じて）
  };

  const project = projects.find((p) => p.id === projectId);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">{project?.name}</h1>

      <TaskForm
        projects={projects}
        projectId={projectId}
        setProjectId={() => {}}
        onCreated={handleCreated}
        onProjectUpdated={handleProjectUpdated}
      />

      <KanbanBoard tasks={tasks} setTasks={setTasks} />
    </main>
  );
}
