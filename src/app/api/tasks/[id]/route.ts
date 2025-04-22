import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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

  try {
    const body = (await req.json()) as TaskUpdateBody;

    const data: Partial<{
      title: string;
      dueDate: string;
      assignee: string;
      tags: string;
      status: Status;
    }> = {};

    if (body.title) data.title = body.title;
    if (body.dueDate) data.dueDate = body.dueDate;
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

    const after = await prisma.task.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json(after);
  } catch (error: unknown) {
    console.error("PATCH /api/tasks/[id] エラー:", error);
    const message = error instanceof Error ? error.message : "サーバーエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest, // eslint-disable-line @typescript-eslint/no-unused-vars
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({
      where: { id: Number(id) },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json(
        { error: "タスクが見つかりません" },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id: Number(id) } });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("DELETE /api/tasks/[id] エラー:", error);
    const message = error instanceof Error ? error.message : "サーバーエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
