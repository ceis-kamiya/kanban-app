// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";
import { Status } from "@prisma/client";

// リクエストボディ用の型（unknownで受けて後で型ガードします）
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
    // JSONをunknownとして受け取り、型を絞り込む
    const body = (await req.json()) as TaskUpdateBody;

    // 更新用データをPartialで定義
    const data: Partial<{
      title: string;
      dueDate: string;
      assignee: string;
      tags: string;
      status: Status;
    }> = {};

    // 各フィールドに対して、型チェックをしてからdataにセット
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

    // 必要なフィールドがあるかチェック
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "更新項目がありません" },
        { status: 400 }
      );
    }

    // 更新前のタスクとプロジェクト情報を取得
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

    // タスクを更新
    const after = await prisma.task.update({ where: { id }, data });

    // 変更テキスト作成などの通知ロジックは省略（既存コードを流用）
    // ...

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

    // 削除前のタスク取得
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

    // タスク削除
    await prisma.task.delete({ where: { id } });

    // 通知ロジックは省略（既存コードを流用）
    // ...

    // 204 No Content を返す
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
