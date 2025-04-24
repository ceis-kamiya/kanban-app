// src/app/api/tasks/notify-deadlines/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";

export const runtime = "nodejs";

/**
 * 締切 3 日前／当日通知用エンドポイント
 * ─────────────────────────────────
 * ・Cron（Vercel の crons 機能など）から毎日 1 回 GET される想定
 * ・IN_PROGRESS のタスクだけを対象に通知するように変更
 */
export async function GET(request: NextRequest) {
  /* ───────── 日付ユーティリティ ───────── */
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatYMD = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /* ───────── "今日" を決定 ─────────
     ?today=yyyy-mm-dd を付けると任意日でテスト可 */
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

  /* ───────── 当日のホスト名（リンク用） ───────── */
  const base = process.env.DEPLOY_URL!; // 例: https://example.vercel.app

  /* ───────── 対象タスク取得 ─────────
     追加条件:  status = 'IN_PROGRESS' のみ抽出 */
  const rawTasks = await prisma.$queryRaw<{
    id: number;
    title: string;
    dueDate: Date;
    assignee: string;
    projectId: string;
    projectManager: string | null;
  }[]>`
    SELECT t.id,
           t.title,
           t."dueDate",
           t.assignee,
           t."projectId",
           p."projectManager"
      FROM "Task" t
      JOIN "Project" p ON p.id = t."projectId"
     WHERE t."dueDate"::date IN (${todayStr}::date, ${in3Str}::date)
       AND t."status" IN ('IN_PROGRESS', 'ON_HOLD', 'REVIEW')
  `;

  /* ───────── 通知送信 ───────── */
  for (const task of rawTasks) {
    const dueStr = formatYMD(task.dueDate);
    const projectUrl = base; // 現状はルートのみ

    if (dueStr === in3Str) {
      await notifyTeams(
        task.projectId,
        `@${task.assignee}さん  
タスク「${task.title}」の期限まであと3日です。  
🔗 ${projectUrl}`
      );
    } else if (dueStr === todayStr) {
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
