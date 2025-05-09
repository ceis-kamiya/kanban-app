import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface ProjectUpdateBody {
  projectManager: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const body = (await req.json()) as ProjectUpdateBody;

    if (!body.projectManager || typeof body.projectManager !== "string" || !body.projectManager.trim()) {
      return NextResponse.json({ error: "責任者は必須です" }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: { projectManager: body.projectManager },
    });

    return NextResponse.json(project);
  } catch (error: unknown) {
    console.error("PATCH /api/projects/[id] エラー:", error);
    const message = error instanceof Error ? error.message : "サーバーエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
