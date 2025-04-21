// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Task, Project } from "@/types";
import { TaskForm } from "@/components/TaskForm";
import { KanbanBoard } from "@/components/KanbanBoard";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);

  // ── プロジェクト一覧を初回一度だけ取得 ──
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((p: Project[]) => {
        setProjects(p);
        if (p.length > 0) setProjectId(p[0].id);
      })
      .catch(console.error);
  }, []);

  // ── projectId が変わるたびに、そのプロジェクトのタスクを取得 ──
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/tasks?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: Task[]) => setTasks(data))
      .catch(console.error);
  }, [projectId]);

  // ── 新しいタスクができたときに Board に追加 ──
  const handleCreated = (t: Task) => {
    if (t.projectId === projectId) {
      setTasks((prev) => [...prev, t]);
    }
  };

  // ── プロジェクトが更新されたときの処理を追加 ──
  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ));
  };

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kanban Board</h1>

      {/* タスク作成フォーム */}
      <TaskForm
        projects={projects}
        projectId={projectId}
        setProjectId={setProjectId}
        onCreated={handleCreated}
        onProjectUpdated={handleProjectUpdated}
      />

      {/* Board 本体 */}
      <KanbanBoard tasks={tasks} setTasks={setTasks} />
    </main>
  );
}
