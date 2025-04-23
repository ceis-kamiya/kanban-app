// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyOnStatusChange } from "@/lib/notifyTriggers";
import { notifyTeams } from "@/lib/notifyTeams";
import { Status } from "@prisma/client";

interface TaskUpdateBody {
  title?: string;
  dueDate?: string;
  assignee?: string;
  tags?: string;
  status?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  // 1. 更新前のタスク取得
  const before = await prisma.task.findUnique({
    where: { id: Number(id) },
    include: { project: true },
  });
  if (!before) {
    return NextResponse.json({ error: "タスクが見つかりません" }, { status: 404 });
  }

  // 2. ボディ解析＋更新データ組み立て
  const body = (await req.json()) as TaskUpdateBody;
  const data: Partial<{
    title: string;
    dueDate: Date;
    assignee: string;
    tags: string;
    status: Status;
  }> = {};

  if (body.title) data.title = body.title;
  if (body.dueDate) data.dueDate = new Date(body.dueDate);
  if (body.assignee) data.assignee = body.assignee;
  if (body.tags) data.tags = body.tags;
  if (
    body.status &&
    Object.values(Status).includes(body.status as Status)
  ) {
    data.status = body.status as Status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新項目がありません" }, { status: 400 });
  }

  // 3. タスク更新
  const after = await prisma.task.update({
    where: { id: Number(id) },
    data,
  });

  // 4. ステータス変更通知
  await notifyOnStatusChange(after, before.status);

  // 5. その他フィールド変更通知
  const changes: string[] = [];
  if (data.title && data.title !== before.title) {
    changes.push(`タイトル: "${before.title}" → "${after.title}"`);
  }
  if (
    data.dueDate &&
    data.dueDate.getTime() !== before.dueDate.getTime()
  ) {
    const oldDate = before.dueDate.toISOString().slice(0, 10);
    const newDate = after.dueDate.toISOString().slice(0, 10);
    changes.push(`期限: ${oldDate} → ${newDate}`);
  }
  if (data.assignee && data.assignee !== before.assignee) {
    changes.push(`担当者: ${before.assignee} → ${after.assignee}`);
  }
  if (data.tags && data.tags !== before.tags) {
    changes.push(`タグ: "${before.tags}" → "${after.tags}"`);
  }

  if (changes.length > 0) {
    // ここだけ DEPLOY_URL のルートを使う
    const projectUrl = process.env.DEPLOY_URL!;

    const text =
      `@${after.assignee}さん  
タスク「${after.title}」の情報が更新されました:\n` +
      changes.map((c) => `- ${c}`).join("\n") +
      `\n\n🔗 ${projectUrl}`;

    await notifyTeams(after.projectId, text);
  }

  return NextResponse.json(after);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id: Number(id) } });
  if (!task) {
    return NextResponse.json({ error: "タスクが見つかりません" }, { status: 404 });
  }
  await prisma.task.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
