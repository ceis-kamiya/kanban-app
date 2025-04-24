// src/app/page.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { Project, Task } from "@/types";
import { TaskForm } from "@/components/TaskForm";
import { KanbanBoard } from "@/components/KanbanBoard";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  /* ───────── プロジェクト一覧 ───────── */
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(console.error);
  }, []);

  /* ───────── 選択プロジェクトのタスク ───────── */
  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    fetch(`/api/tasks?projectId=${projectId}`)
      .then((r) => r.json())
      .then(setTasks)
      .catch(console.error);
  }, [projectId]);

  /* ===== 楽観的 UI 用ユーティリティ ===== */
  /** ① 追加（tempId は負数で発行） */
  const addTaskOptimistic = (task: Task) =>
    setTasks((prev) => [...prev, task]);

  /** ② commit → tempId を正式 ID で置換 */
  const commitTask = (tempId: number, saved: Task) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === tempId ? saved : t))
    );

  /** ③ rollback → tempId を除去 */
  const rollbackTask = (tempId: number) =>
    setTasks((prev) => prev.filter((t) => t.id !== tempId));

  /** プロジェクト責任者の楽観更新は “とりあえず” 即時反映で十分 */
  const handleProjectUpdated = (updated: Project) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kanban Board</h1>

      <TaskForm
        /* ─ props ─ */
        projects={projects}
        projectId={projectId}
        setProjectId={setProjectId}
        /* 楽観 UI コールバック */
        onAdd={addTaskOptimistic}
        onCommit={commitTask}
        onRollback={rollbackTask}
        /* 既存 */
        onProjectUpdated={handleProjectUpdated}
      />

      <KanbanBoard tasks={tasks} setTasks={setTasks} />
    </main>
  );
}
