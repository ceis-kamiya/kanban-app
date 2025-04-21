// src/components/TaskForm.tsx
"use client";

import React, { useState } from "react";
import { Task, Project } from "@/types";

type Props = {
  projects?: Project[];             // プロジェクト一覧
  projectId: string;                // 選択中のプロジェクトID
  setProjectId: (id: string) => void; // プロジェクト切替ハンドラ
  onCreated: (t: Task) => void;     // タスク作成後コールバック
};

export function TaskForm({
  projects = [],
  projectId,
  setProjectId,
  onCreated,
}: Props) {
  const [title, setTitle]     = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [tags, setTags]       = useState("");  // ← 変数名を tags に変更

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        dueDate,
        assignee,
        tags,           // ← ここで tags を送信
        projectId,
      }),
    });

    if (!res.ok) {
      const errmsg = await res.text();
      console.error("[API Error]", res.status, errmsg);
      alert(`エラー ${res.status}: ${errmsg}`);
      return;
    }

    const task: Task = await res.json();
    onCreated(task);

    // フォームクリア
    setTitle("");
    setDueDate("");
    setAssignee("");
    setTags("");
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2 items-end">
      <input
        type="text"
        placeholder="タイトル"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="border p-1 rounded"
        required
      />
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        className="border p-1 rounded"
        required
      />
      <input
        type="text"
        placeholder="担当者"
        value={assignee}
        onChange={e => setAssignee(e.target.value)}
        className="border p-1 rounded"
        required
      />
      <textarea
        placeholder="メモ"
        value={tags}             /* ← こちらも tags を使う */
        onChange={e => setTags(e.target.value)}
        className="border p-1 rounded w-full"
      />
      <label className="border p-1 rounded flex items-center">
        プロジェクト
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="ml-2"
          required
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="px-3 py-1 bg-blue-600 text-white rounded"
      >
        追加
      </button>
    </form>
  );
}
