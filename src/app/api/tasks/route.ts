// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyOnStatusChange } from "@/lib/notifyTriggers";
import { Status } from "@prisma/client";

interface TaskCreateBody {
  title?: unknown;
  dueDate?: unknown;
  assignee?: unknown;
  tags?: unknown;
  status?: unknown;
  projectId?: unknown;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(tasks);
  } catch (error: unknown) {
    console.error("GET /api/tasks エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TaskCreateBody;

    // 必須フィールドチェック
    if (
      typeof body.title !== "string" ||
      typeof body.dueDate !== "string" ||
      typeof body.assignee !== "string" ||
      typeof body.projectId !== "string"
    ) {
      return NextResponse.json(
        { error: "title, dueDate, assignee, projectId は必須です" },
        { status: 400 }
      );
    }

    // ステータス初期値
    let newStatus: Status = "IN_PROGRESS";
    if (
      typeof body.status === "string" &&
      Object.values(Status).includes(body.status as Status)
    ) {
      newStatus = body.status as Status;
    }

    // 重複チェック
    const dup = await prisma.task.findFirst({
      where: {
        title: body.title,
        assignee: body.assignee,
        projectId: body.projectId,
      },
    });
    if (dup) {
      return NextResponse.json(
        { error: "同じタイトル＆担当者のタスクが既に存在します" },
        { status: 409 }
      );
    }

    // タスク作成
    const task = await prisma.task.create({
      data: {
        title: body.title,
        dueDate: new Date(body.dueDate),
        assignee: body.assignee,
        tags: typeof body.tags === "string" ? body.tags : "",
        status: newStatus,
        projectId: body.projectId,
      },
    });

    // ① 新規作成時も IN_PROGRESS 通知
    await notifyOnStatusChange(task);

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/tasks エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
