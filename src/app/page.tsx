// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Task, Project } from "@/types";
import { TaskForm } from "@/components/TaskForm";
import { KanbanBoard } from "@/components/KanbanBoard";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  // ── プロジェクト一覧を取得（自動選択なし） ──
  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: Project[]) => {
        setProjects(data);
      })
      .catch(console.error);
  }, []);

  // ── projectId が変わったらタスク取得、nullならクリア ──
  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    fetch(`/api/tasks?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data: Task[]) => {
        setTasks(data);
      })
      .catch(console.error);
  }, [projectId]);

  // 新規作成時の処理
  const handleCreated = (t: Task) => {
    if (t.projectId === projectId) {
      setTasks((prev) => [...prev, t]);
    }
  };

  // プロジェクト更新時の処理
  const handleProjectUpdated = (updated: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kanban Board</h1>

      <TaskForm
        projects={projects}
        projectId={projectId}
        setProjectId={setProjectId}
        onCreated={handleCreated}
        onProjectUpdated={handleProjectUpdated}
      />

      <KanbanBoard tasks={tasks} setTasks={setTasks} />
    </main>
  );
}
