// src/lib/notifyTriggers.ts
import prisma from "./prisma";
import { notifyTeams } from "./notifyTeams";
import { Status, Task } from "@prisma/client";

/**
 * タスクのステータス変更／フィールド変更に応じた通知をまとめて行うヘルパー
 * @param task         更新後の Task オブジェクト
 * @param beforeStatus 更新前のステータス（新規作成時は undefined）
 */
export async function notifyOnStatusChange(
  task: Task,
  beforeStatus?: Status
) {
  const assignee = task.assignee;
  const project = await prisma.project.findUnique({
    where: { id: task.projectId },
    select: { projectManager: true },
  });
  const manager = project?.projectManager;

  // ① In Progress に入ったとき（新規作成／移動含む） → 担当者へ
  if (task.status === "IN_PROGRESS" && beforeStatus !== "IN_PROGRESS") {
    await notifyTeams(
      null,
      `@${assignee}さん タスク『${task.title}』が In Progress に入りました。`
    );
  }

  // ② Review に移動したとき → 責任者へ
  if (task.status === "REVIEW" && beforeStatus !== "REVIEW" && manager) {
    await notifyTeams(
      null,
      `@${manager}さん タスク『${task.title}』が Review に入りました。`
    );
  }

  // ③ Done に移動したとき → 担当者＋責任者へ
  if (task.status === "DONE" && beforeStatus !== "DONE") {
    const msg = `タスク『${task.title}』が Done になりました。`;
    await notifyTeams(null, `@${assignee}さん ${msg}`);
    if (manager) {
      await notifyTeams(null, `@${manager}さん ${msg}`);
    }
  }
}
