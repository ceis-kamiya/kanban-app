// src/components/TaskForm.tsx
"use client";

import React, { useState } from "react";
import { Project, Task } from "@/types";
import { ProjectManagerForm } from "./ProjectManagerForm";

type Props = {
  projects: Project[];
  projectId: string;
  setProjectId: (id: string) => void;
  onCreated: (task: Task) => void;
  onProjectUpdated: (project: Project) => void;
};

export function TaskForm({ 
  projects, 
  projectId, 
  setProjectId, 
  onCreated,
  onProjectUpdated 
}: Props) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [projectUpdated, setProjectUpdated] = useState(0);

  const selectedProject = projects.find((p) => p.id === projectId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          assignee,
          dueDate,
          tags,
          projectId,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const task = await res.json();
      onCreated(task);

      // フォームをリセット
      setTitle("");
      setAssignee("");
      setTags("");
      // 日付はそのまま

    } catch (err) {
      console.error(err);
      alert("タスクの作成に失敗しました");
    }
  }

  return (
    <div className="mb-6">
      <div className="flex gap-4 items-end mb-4">
        <div>
          <label className="block text-sm mb-1">プロジェクト</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="border p-2 rounded"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <ProjectManagerForm
            key={`${selectedProject.id}-${projectUpdated}`}
            project={selectedProject}
            onUpdated={(project) => {
              setProjectUpdated(n => n + 1);
              onProjectUpdated(project);
            }}
          />
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タスク名"
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
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
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="タグ（カンマ区切り）"
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          作成
        </button>
      </form>
    </div>
  );
}
