// src/app/api/tasks/notify-deadlines/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";

export const runtime = "nodejs";

/**
 * 締切 3 日前／当日通知用エンドポイント
 * Cron で毎日実行します。
 * ?today=YYYY-MM-DD で任意の日付をシミュレート可能。
 */
export async function GET(request: NextRequest) {
  const override = request.nextUrl.searchParams.get("today");
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatYMD = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let today: Date;
  if (override) {
    const [Y, M, D] = override.split("-").map((v) => parseInt(v, 10));
    today = new Date(Y, M - 1, D);
  } else {
    const now = new Date();
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const in3 = new Date(today);
  in3.setDate(in3.getDate() + 3);

  const todayStr = formatYMD(today);
  const in3Str = formatYMD(in3);

  const base = process.env.PROJECT_BASE_URL || "";

  const rawTasks = await prisma.$queryRaw<{
    id: number;
    title: string;
    dueDate: Date;
    assignee: string;
    projectId: string;
    projectManager: string | null;
  }[]>`
    SELECT
      t.id,
      t.title,
      t."dueDate",
      t.assignee,
      t."projectId",
      p."projectManager"
    FROM "Task" t
    JOIN "Project" p ON p.id = t."projectId"
    WHERE t."dueDate"::date IN (${todayStr}::date, ${in3Str}::date)
  `;

  for (const task of rawTasks) {
    const d = new Date(task.dueDate);
    const dateStr = formatYMD(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    const assignee = task.assignee;
    const manager = task.projectManager;
    const projectUrl = `${base}/${task.projectId}`;

    if (dateStr === in3Str) {
      await notifyTeams(
        task.projectId,
        `@${assignee}さん  
タスク「${task.title}」の期限まであと3日です。  
🔗 ${projectUrl}`
      );
    } else if (dateStr === todayStr) {
      const mentions = manager
        ? `@${assignee}さん @${manager}さん`
        : `@${assignee}さん`;
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
