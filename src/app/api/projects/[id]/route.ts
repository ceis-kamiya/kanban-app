import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();

    if (!body.projectManager) {
      return NextResponse.json(
        { error: "責任者は必須です" },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: { projectManager: body.projectManager },
    });

    return NextResponse.json(project);
  } catch (err: any) {
    console.error("PATCH /api/projects/[id] エラー:", err);
    return NextResponse.json(
      { error: err?.message ?? "サーバーエラー" },
      { status: err?.status ?? 500 }
    );
  }
}