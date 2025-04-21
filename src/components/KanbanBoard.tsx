// src/components/KanbanBoard.tsx
"use client";

import React from "react";
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
          <Column key={col.key} column={col} tasks={tasks} />
        ))}
      </div>
    </DndContext>
  );
}

// カラムコンポーネントを分離してリファクタリング
function Column({ 
  column, 
  tasks 
}: { 
  column: { key: Status; title: string }; 
  tasks: Task[]; 
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
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="bg-white p-3 rounded shadow cursor-grab select-none touch-none"
    >
      <div className="font-medium mb-1">{task.title}</div>
      <div className="text-xs text-gray-600">
        期限: {new Date(task.dueDate).toLocaleDateString()}
      </div>
      <div className="text-xs text-gray-600">
        担当: {task.assignee}
      </div>
    </div>
  );
}
