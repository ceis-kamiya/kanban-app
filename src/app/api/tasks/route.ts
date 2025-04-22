// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";
import { Status } from "@prisma/client";

// リクエストボディの型定義
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
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TaskCreateBody;

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

    const title = body.title;
    const dueDateStr = body.dueDate;
    const assignee = body.assignee;
    const projectId = body.projectId;
    const tags = typeof body.tags === "string" ? body.tags : "";
    let newStatus: Status = "IN_PROGRESS";
    if (
      typeof body.status === "string" &&
      Object.values(Status).includes(body.status as Status)
    ) {
      newStatus = body.status as Status;
    }

    const dup = await prisma.task.findFirst({
      where: { title, assignee, projectId },
    });
    if (dup) {
      return NextResponse.json(
        { error: "同じタイトル＆担当者のタスクが既に存在します" },
        { status: 409 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        dueDate: new Date(dueDateStr),
        assignee,
        tags,
        status: newStatus,
        projectId,
      },
    });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project?.projectManager && newStatus === "IN_PROGRESS") {
      const appUrl = process.env.DEPLOY_URL ?? "";
      const projectUrl = `${process.env.PROJECT_BASE_URL}/${projectId}`;
      const text =
        `@${assignee}さん\n` +
        `新しいタスク「${title}」が IN_PROGRESS に入りました。\n\n` +
        `• 期限: ${new Date(dueDateStr).toLocaleDateString()}\n` +
        (tags ? `• タグ: ${tags}\n` : "") +
        `\n📱 ${appUrl}\n🔗 ${projectUrl}`;
      await notifyTeams(projectId, text);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/tasks エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
