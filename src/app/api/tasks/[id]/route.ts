// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyOnStatusChange } from "@/lib/notifyTriggers";
import { notifyTeams }          from "@/lib/notifyTeams";
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

  // 更新前データ取得
  const before = await prisma.task.findUnique({
    where: { id: Number(id) },
    include: { project: true },
  });
  if (!before) {
    return NextResponse.json(
      { error: "タスクが見つかりません" },
      { status: 404 }
    );
  }

  // リクエストボディ
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
    return NextResponse.json(
      { error: "更新項目がありません" },
      { status: 400 }
    );
  }

  // タスク更新
  const after = await prisma.task.update({
    where: { id: Number(id) },
    data,
  });

  // ①～③: ステータス変更通知
  await notifyOnStatusChange(after, before.status);

  // ⑥: その他フィールド変更時の通知（担当者へ）
  if (
    (data.title && data.title !== before.title) ||
    (data.dueDate &&
      data.dueDate.getTime() !== before.dueDate.getTime()) ||
    (data.tags && data.tags !== before.tags) ||
    (data.assignee && data.assignee !== before.assignee)
  ) {
    await notifyTeams(
      null,
      `@${after.assignee}さん タスク『${after.title}』の情報が更新されました。`
    );
  }

  return NextResponse.json(after);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  // 存在チェック
  const task = await prisma.task.findUnique({
    where: { id: Number(id) },
  });
  if (!task) {
    return NextResponse.json(
      { error: "タスクが見つかりません" },
      { status: 404 }
    );
  }

  // 削除
  await prisma.task.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
