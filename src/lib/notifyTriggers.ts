// src/lib/notifyTriggers.ts
import prisma from "./prisma";
import { notifyTeams } from "./notifyTeams";
import { Status, Task } from "@prisma/client";

/**
 * ステータス変更時の Teams 通知
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

  // ここだけを返す
  const projectUrl = process.env.DEPLOY_URL!;

  if (task.status === "IN_PROGRESS" && beforeStatus !== "IN_PROGRESS") {
    await notifyTeams(
      task.projectId,
      `@${assignee}さん  
タスク「${task.title}」が In Progress に入りました。  
🔗 ${projectUrl}`
    );
  }

  if (task.status === "REVIEW" && beforeStatus !== "REVIEW" && manager) {
    await notifyTeams(
      task.projectId,
      `@${manager}さん  
タスク「${task.title}」が Review に入りました。  
🔗 ${projectUrl}`
    );
  }

  if (task.status === "DONE" && beforeStatus !== "DONE" && manager) {
    await notifyTeams(
      task.projectId,
      `@${assignee}さん @${manager}さん  
🎉 タスク「${task.title}」が完了しました！おつかれさまでした✨  
🔗 ${projectUrl}`
    );
  }
}
