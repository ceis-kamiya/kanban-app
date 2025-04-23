// src/app/api/tasks/notify-deadlines/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";

export const runtime = "nodejs";

/**
 * 締切3日前と当日通知用エンドポイント
 * 毎日 Cron で実行してください
 */
export async function GET() {
  const today = new Date();
  const in3Days = new Date();
  in3Days.setDate(today.getDate() + 3);

  // 日付部分だけ比較できるように ISO 文字列の先頭10文字を利用
  const todayStr = today.toISOString().slice(0, 10);
  const in3Str = in3Days.toISOString().slice(0, 10);

  // 期限が今日か3日後のタスクを取得
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: {
        in: [new Date(todayStr), new Date(in3Str)],
      },
    },
    include: { project: true },
  });

  for (const task of tasks) {
    const dueStr = task.dueDate.toISOString().slice(0, 10);
    const assignee = task.assignee;
    const manager = task.project.projectManager;

    if (dueStr === in3Str) {
      // ④ 締切3日前
      await notifyTeams(
        null,
        `@${assignee}さん タスク『${task.title}』の期限まであと3日です。`
      );
    } else if (dueStr === todayStr) {
      // ⑤ 締切当日
      await notifyTeams(
        null,
        `@${assignee}さん タスク『${task.title}』の期限は本日です。`
      );
      if (manager) {
        await notifyTeams(
          null,
          `@${manager}さん タスク『${task.title}』の期限は本日です。`
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
