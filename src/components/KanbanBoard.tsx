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
  useDroppable,
  useDraggable,
  rectIntersection,
} from "@dnd-kit/core";
import { Task, Status } from "@/types";

type KanbanBoardProps = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

export function KanbanBoard({ tasks, setTasks }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const id = String(active.id).replace("task-", "");
    const newStatus = over.id as Status;
    const prev = tasks.find((t) => t.id === Number(id));
    if (!prev || prev.status === newStatus) return;

    // 楽観更新
    setTasks((ts) =>
      ts.map((t) => (t.id === prev.id ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("更新に失敗しました");
      // 巻き戻し
      setTasks((ts) =>
        ts.map((t) => (t.id === prev.id ? prev : t))
      );
    }
  };

  const columns = [
    { key: "BACKLOG" as const, title: "Backlog" },
    { key: "ON_HOLD" as const, title: "On Hold" },
    { key: "IN_PROGRESS" as const, title: "In Progress" },
    { key: "REVIEW" as const, title: "Review" },
    { key: "DONE" as const, title: "Done" },
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.key}
            column={col}
            tasks={tasks}
            setTasks={setTasks}
          />
        ))}
      </div>
    </DndContext>
  );
}

type ColumnProps = {
  column: { key: Status; title: string };
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

function Column({ column, tasks, setTasks }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`w-64 p-2 rounded min-h-[400px] border ${
        isOver
          ? "border-blue-500 bg-gray-100/80"
          : "border-gray-300 bg-gray-50/80"
      }`}
    >
      <h3 className="font-semibold mb-3">{column.title}</h3>
      <div className="space-y-2">
        {tasks
          .filter((t) => t.status === column.key)
          .map((task) => (
            <TaskCard key={task.id} task={task} setTasks={setTasks} />
          ))}
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: Task;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

function TaskCard({ task, setTasks }: TaskCardProps) {
  const [isEditing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [assignee, setAssignee] = useState(task.assignee);
  const [dueDate, setDueDate] = useState(task.dueDate.split("T")[0]);
  const [tags, setTags] = useState(task.tags);

  // ドラッグハンドル
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `task-${task.id}` });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  // 保存
  const save = async (e: React.FormEvent) => {
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
          status: task.status,
          projectId: task.projectId,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTasks((ts) =>
        ts.map((t) => (t.id === updated.id ? updated : t))
      );
      setEditing(false);
    } catch {
      alert("更新失敗");
    }
  };

  // 削除
  const remove = async () => {
    if (!confirm("このタスクを削除しますか？")) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setTasks((ts) => ts.filter((t) => t.id !== task.id));
    } catch {
      alert("削除失敗");
    }
  };

  if (isEditing) {
    return (
      <form
        onSubmit={save}
        className="bg-white p-4 rounded shadow flex flex-col gap-2"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          required
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="担当者"
          required
          className="border p-2 rounded w-full"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="コメント"
          className="border p-2 rounded w-full"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            保存
          </button>
          <button
            type="button"
            onPointerDown={stop}
            onClick={() => setEditing(false)}
            className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      style={style}
      className="bg-white p-4 rounded shadow select-none relative"
    >
      {/* ドラッグハンドル */}
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="cursor-grab font-medium mb-2"
      >
        {task.title}
      </div>

      <div className="text-xs text-gray-600 mb-2">
        期限: {new Date(task.dueDate).toLocaleDateString()}
      </div>
      <div className="text-xs text-gray-600 mb-2">
        担当: {task.assignee}
      </div>
      {task.tags && (
        <div className="text-xs text-gray-600 mb-2">コメント: {task.tags}</div>
      )}

      <div className="flex gap-2 absolute bottom-2 right-2">
        <button
          onPointerDown={stop}
          onClick={() => setEditing(true)}
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
        >
          編集
        </button>
        <button
          onPointerDown={stop}
          onClick={remove}
          className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          削除
        </button>
      </div>
    </div>
  );
}
