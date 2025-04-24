// src/components/TaskForm.tsx
"use client";

import React, { useState } from "react";
import { Project, Task, Status } from "@/types";
import { ProjectManagerForm } from "./ProjectManagerForm";

type Props = {
  projects: Project[];
  projectId: string | null;
  setProjectId: (id: string | null) => void;

  /* ===== 楽観的 UI 用 ===== */
  onAdd: (task: Task) => void;                    // 楽観追加
  onCommit: (tempId: number, saved: Task) => void; // 正式反映
  onRollback: (tempId: number) => void;            // 失敗ロールバック

  /* 既存 */
  onProjectUpdated: (project: Project) => void;
};

export function TaskForm({
  projects,
  projectId,
  setProjectId,
  onAdd,
  onCommit,
  onRollback,
  onProjectUpdated,
}: Props) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [isSaving, setSaving] = useState(false);

  const selectedProject = projects.find((p) => p.id === projectId) ?? null;

  /* ───────── 送信 ───────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      alert("プロジェクトを選択してください");
      return;
    }

    const tempId = -Date.now(); // 負数 ID＝一意なテンポラリ
    const optimisticTask: Task = {
      id: tempId,
      projectId,
      title,
      assignee,
      dueDate: new Date(dueDate).toISOString(),
      tags,
      status: "IN_PROGRESS" satisfies Status,
    };

    /* ① 先に UI へ反映 */
    onAdd(optimisticTask);

    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          assignee,
          dueDate,
          tags,
          projectId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      /* ② サーバー確定 → tempId 置換 */
      const saved: Task = await res.json();
      onCommit(tempId, saved);

      /* 完了 → フォームリセット */
      setTitle("");
      setAssignee("");
      setTags("");
    } catch (err) {
      console.error(err);
      /* ③ 失敗 → ロールバック */
      onRollback(tempId);
      alert("タスクの作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6">
      {/* ───────── プロジェクト選択 & 責任者フォーム ───────── */}
      <div className="flex gap-4 items-end mb-4">
        <div>
          <label className="block text-sm mb-1">プロジェクト</label>
          <select
            value={projectId ?? ""}
            onChange={(e) =>
              setProjectId(e.target.value === "" ? null : e.target.value)
            }
            className="border p-2 rounded"
          >
            <option value="" disabled>
              -- プロジェクトを選択 --
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <ProjectManagerForm
            project={selectedProject}
            onUpdated={onProjectUpdated}
          />
        )}
      </div>

      {/* ───────── タスク入力フォーム ───────── */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タスク名"
          required
          className="border p-2 rounded"
        />
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="担当者"
          required
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="コメント"
          className="border p-2 rounded"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
        >
          {isSaving ? "保存中..." : "作成"}
        </button>
      </form>
    </div>
  );
}
