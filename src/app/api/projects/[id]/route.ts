import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// リクエストボディの型
interface ProjectUpdateBody {
  projectManager?: unknown;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const id = params.id;
    // JSONを受け取って型を絞り込む
    const body = (await req.json()) as ProjectUpdateBody;

    // projectManagerが文字列かつ空でないことをチェック
    if (typeof body.projectManager !== "string" || !body.projectManager.trim()) {
      return NextResponse.json(
        { error: "責任者は必須です" },
        { status: 400 }
      );
    }

    // プロジェクト更新
    const project = await prisma.project.update({
      where: { id },
      data: { projectManager: body.projectManager },
    });

    return NextResponse.json(project);
  } catch (error: unknown) {
    console.error("PATCH /api/projects/[id] エラー:", error);
    const message = error instanceof Error ? error.message : "サーバーエラー";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
