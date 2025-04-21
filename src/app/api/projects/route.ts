// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("GET /api/projects エラー:", error);
    // 空配列で返すことで、クライアント側の projects.map が必ず動くようにする
    return NextResponse.json([]);
  }
}
