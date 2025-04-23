// src/app/projects/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Task, Project } from "@/types";
import { TaskForm } from "@/components/TaskForm";
import { KanbanBoard } from "@/components/KanbanBoard";

// ↓ ここを Promise ではなく同期の型に変更
export default function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id;
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((p: Project[]) => setProjects(p));
  }, []);

  useEffect(() => {
    fetch(`/api/tasks?projectId=${projectId}`)
      .then((r) => r.json())
      .then((ts: Task[]) => setTasks(ts))
      .catch(console.error);
  }, [projectId]);

  const handleCreated = (t: Task) => {
    if (t.projectId === projectId) {
      setTasks((prev) => [...prev, t]);
    }
  };

  const handleProjectUpdated = (updated: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {projects.find((p) => p.id === projectId)?.name || "プロジェクト"}
      </h1>

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
