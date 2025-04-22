// src/components/KanbanBoard.tsx
"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  useDroppable,
  useDraggable,
  rectIntersection,
} from "@dnd-kit/core";
import { Task, Status } from "@/types";

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

export function KanbanBoard({ tasks, setTasks }: Props) {
  // シンプルなセンサー設定
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const sensors = useSensors(mouseSensor, touchSensor);

  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    console.log("🟦 Drag Start:", event.active.id);
  };

  // ドラッグ中の処理
  const handleDragOver = (event: DragOverEvent) => {
    console.log("🟨 Drag Over:", {
      active: event.active.id,
      over: event.over?.id,
    });
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("🛑 Drag End:", { active: active.id, over: over?.id });

    if (!over) {
      console.log("ドロップ先が見つかりませんでした");
      return;
    }

    const taskId = String(active.id).replace("task-", "");
    const newStatus = String(over.id) as Status;
    console.log("Moving task", taskId, "to", newStatus);

    // 同じステータスへのドロップは無視
    const currentTask = tasks.find(t => t.id === Number(taskId));
    if (currentTask?.status === newStatus) {
      console.log("Same status, skipping update");
      return;
    }

    // 楽観的UI更新
    setTasks((prev) =>
      prev.map((t) =>
        t.id === Number(taskId) ? { ...t, status: newStatus } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const updatedTask = await res.json();
      console.log("Task updated successfully:", updatedTask);

    } catch (err) {
      console.error("Failed to update task:", err);
      alert("タスクの更新に失敗しました");

      // APIが失敗した場合は元のステータスに戻す
      setTasks((prev) =>
        prev.map((t) =>
          t.id === Number(taskId) ? { ...t, status: currentTask?.status ?? t.status } : t
        )
      );
    }
  };

  const columns: { key: Status; title: string }[] = [
    { key: "BACKLOG", title: "Backlog" },
    { key: "ON_HOLD", title: "On Hold" },
    { key: "IN_PROGRESS", title: "In Progress" },
    { key: "REVIEW", title: "Review" },
    { key: "DONE", title: "Done" },
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column key={col.key} column={col} tasks={tasks} setTasks={setTasks} />
        ))}
      </div>
    </DndContext>
  );
}

// カラムコンポーネントを更新
function Column({ 
  column, 
  tasks,
  setTasks
}: { 
  column: { key: Status; title: string }; 
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    data: {
      type: "COLUMN",
      column,
    },
  });

  const columnTasks = tasks.filter((t) => t.status === column.key);

  return (
    <div
      ref={setNodeRef}
      className={`relative w-64 shrink-0 p-2 rounded min-h-[400px] border ${
        isOver 
          ? "border-blue-500 bg-gray-100/80" 
          : "border-gray-300 bg-gray-50/80"
      }`}
    >
      <h3 className="font-semibold mb-3">{column.title}</h3>
      <div className="space-y-2">
        {columnTasks.map((task) => (
          <TaskCard key={task.id} task={task} setTasks={setTasks} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, setTasks }: { task: Task; setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [assignee, setAssignee] = useState(task.assignee);
  const [dueDate, setDueDate] = useState(task.dueDate.split('T')[0]); // YYYY-MM-DD形式に変換
  const [tags, setTags] = useState(task.tags);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: "TASK",
      task,
    },
  });

  const style: React.CSSProperties = {
    transform: transform 
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          assignee,
          dueDate: new Date(dueDate).toISOString(),
          tags,
          status: task.status, // 現在のステータスを維持
          projectId: task.projectId, // プロジェクトIDを維持
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const updated = await res.json();
      setTasks(prev => prev.map(t => 
        t.id === task.id ? updated : t
      ));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("タスクの更新に失敗しました");
    }
  }

  async function handleDelete() {
    if (!confirm("このタスクを削除してもよろしいですか？")) {
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      console.error(err);
      alert("タスクの削除に失敗しました");
    }
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="bg-white p-3 rounded shadow">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="block w-full border p-1 rounded mb-2"
          placeholder="タイトル"
          required
        />
        <input
          type="text"
          value={assignee}
          onChange={e => setAssignee(e.target.value)}
          className="block w-full border p-1 rounded mb-2"
          placeholder="担当者"
          required
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="block w-full border p-1 rounded mb-2"
          required
        />
        <input
          type="text"
          value={tags}
          onChange={e => setTags(e.target.value)}
          className="block w-full border p-1 rounded mb-2"
          placeholder="タグ（カンマ区切り）"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setTitle(task.title);
              setAssignee(task.assignee);
              setDueDate(task.dueDate.split('T')[0]);
              setTags(task.tags);
              setIsEditing(false);
            }}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white p-3 rounded shadow cursor-grab select-none touch-none"
    >
      <div className="flex gap-2">
        <div className="font-medium">
          {task.title}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            編集
          </button>
          <button
            onClick={handleDelete}
            className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
          >
            削除
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-600">
        期限: {new Date(task.dueDate).toLocaleDateString()}
      </div>
      <div className="text-xs text-gray-600">
        担当: {task.assignee}
      </div>
      {task.tags && (
        <div className="text-xs text-gray-600">
          タグ: {task.tags}
        </div>
      )}
    </div>
  );
}
