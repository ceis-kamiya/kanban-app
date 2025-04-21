/* ──────────────────────────────────────────────
   src/app/api/tasks/route.ts
─────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";
import { Status } from "@prisma/client";

/**──────────────────────────────────────────────
 *  GET /api/tasks
 *  - ?projectId=xxx があればそのプロジェクトで絞り込み
 *  - dueDate 昇順で返却
 *─────────────────────────────────────────────*/
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { dueDate: "asc" },
    });
    // プレフィックスなしのままのステータスを返す
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("GET /api/tasks エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

/**──────────────────────────────────────────────
 *  POST /api/tasks
 *  - 必須: title, dueDate, assignee, projectId
 *  - status 未指定なら IN_PROGRESS
 *  - 作成時に IN_PROGRESS なら担当者へ通知
 *─────────────────────────────────────────────*/
export async function POST(request: NextRequest) {
  try {
    const { title, dueDate, assignee, tags, status, projectId } = await request.json();

    // 必須チェック
    if (!title || !dueDate || !assignee || !projectId) {
      return NextResponse.json(
        { error: "title, dueDate, assignee, projectId は必須です" },
        { status: 400 }
      );
    }

    // 同一プロジェクト内の重複チェック
    const dup = await prisma.task.findFirst({
      where: { title, assignee, projectId },
    });
    if (dup) {
      return NextResponse.json(
        { error: "同じタイトル＆担当者のタスクが既に存在します" },
        { status: 409 }
      );
    }

    // デフォルトステータス
    const newStatus = (status as Status) ?? "IN_PROGRESS";

    // タスク保存
    const task = await prisma.task.create({
      data: {
        title,
        dueDate: new Date(dueDate),
        assignee,
        tags: tags ?? "",
        status: newStatus,
        projectId,
      },
    });

    // プロジェクトの情報を取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    // 「IN_PROGRESS」になった瞬間のみ通知
    const webhookUrl = project?.channelWebhookUrl || process.env.TEAMS_WEBHOOK_URL;
    if (project?.projectManager && webhookUrl && newStatus === "IN_PROGRESS") {
      const text =
        `@${assignee} さん、新しいタスク「${title}」が IN_PROGRESS に入りました。\n` +
        `期限: ${new Date(dueDate).toLocaleDateString()}`;

      await notifyTeams(webhookUrl, text);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
