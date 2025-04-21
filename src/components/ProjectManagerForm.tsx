// src/components/ProjectManagerForm.tsx
"use client";

import React, { useState } from "react";
import { Project } from "@/types";

type Props = {
  project: Project;
  onUpdated: (project: Project) => void;
};

export function ProjectManagerForm({ project, onUpdated }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [manager, setManager] = useState(project.projectManager);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectManager: manager }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const updated = await res.json();
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("責任者の更新に失敗しました");
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span>責任者: {project.projectManager}</span>
        <button 
          onClick={() => setIsEditing(true)}
          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          編集
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={manager}
        onChange={e => setManager(e.target.value)}
        className="border p-1 rounded"
        required
      />
      <button
        type="submit"
        className="px-2 py-1 bg-blue-600 text-white rounded"
      >
        保存
      </button>
      <button
        type="button"
        onClick={() => {
          setManager(project.projectManager);
          setIsEditing(false);
        }}
        className="px-2 py-1 bg-gray-100 rounded"
      >
        キャンセル
      </button>
    </form>
  );
}