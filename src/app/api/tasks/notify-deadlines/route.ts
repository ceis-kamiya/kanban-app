// src/app/api/tasks/notify-deadlines/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";

export const runtime = "nodejs";

/**
 * 締切 3 日前／当日通知用エンドポイント
 */
export async function GET(request: NextRequest) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatYMD = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const now = request.nextUrl.searchParams.get("today")
    ? (() => {
        const [Y, M, D] = request.nextUrl
          .searchParams.get("today")!
          .split("-")
          .map(Number);
        return new Date(Y, M - 1, D);
      })()
    : new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in3 = new Date(today);
  in3.setDate(in3.getDate() + 3);

  const todayStr = formatYMD(today);
  const in3Str = formatYMD(in3);

  // ここもルートのみ
  const base = process.env.DEPLOY_URL!;

  const rawTasks = await prisma.$queryRaw<{
    id: number;
    title: string;
    dueDate: Date;
    assignee: string;
    projectId: string;
    projectManager: string | null;
  }[]>`
    SELECT t.id, t.title, t."dueDate", t.assignee, t."projectId", p."projectManager"
    FROM "Task" t
    JOIN "Project" p ON p.id = t."projectId"
    WHERE t."dueDate"::date IN (${todayStr}::date, ${in3Str}::date)
  `;

  for (const task of rawTasks) {
    const d = new Date(task.dueDate);
    const dateStr = formatYMD(d);

    const projectUrl = base; // ← プロジェクト ID は消えています

    if (dateStr === in3Str) {
      await notifyTeams(
        task.projectId,
        `@${task.assignee}さん  
タスク「${task.title}」の期限まであと3日です。  
🔗 ${projectUrl}`
      );
    } else if (dateStr === todayStr) {
      const mentions = task.projectManager
        ? `@${task.assignee}さん @${task.projectManager}さん`
        : `@${task.assignee}さん`;
      await notifyTeams(
        task.projectId,
        `${mentions}  
タスク「${task.title}」の期限は本日です。  
🔗 ${projectUrl}`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
