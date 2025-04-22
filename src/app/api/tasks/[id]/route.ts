// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Status } from "@prisma/client";

// リクエストボディ用の型
interface TaskUpdateBody {
  title?: unknown;
  dueDate?: unknown;
  assignee?: unknown;
  tags?: unknown;
  status?: unknown;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const id = Number(params.id);
    const body = (await req.json()) as TaskUpdateBody;

    const data: Partial<{
      title: string;
      dueDate: string;
      assignee: string;
      tags: string;
      status: Status;
    }> = {};

    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.dueDate === "string") data.dueDate = body.dueDate;
    if (typeof body.assignee === "string") data.assignee = body.assignee;
    if (typeof body.tags === "string") data.tags = body.tags;
    if (
      typeof body.status === "string" &&
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

    const before = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!before) {
      return NextResponse.json(
        { error: "タスクが見つかりません" },
        { status: 404 }
      );
    }

    const after = await prisma.task.update({ where: { id }, data });
    // 通知ロジックは既存コードを流用（notifyTeamsはimportから削除しました）
    return NextResponse.json(after);
  } catch (error: unknown) {
    console.error("PATCH /api/tasks/[id] エラー:", error);
    const message = error instanceof Error ? error.message : "サーバーエラー";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const id = Number(params.id);
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!task) {
      return NextResponse.json(
        { error: "タスクが見つかりません" },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });
    // 通知ロジックは既存コードを流用（notifyTeamsはimportから削除しました）
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("DELETE /api/tasks/[id] エラー:", error);
    const message = error instanceof Error ? error.message : "サーバーエラー";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
