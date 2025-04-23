// src/app/api/projects/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(projects);
  } catch (error: unknown) {
    console.error("GET /api/projects エラー:", error);
    return NextResponse.json([], { status: 500 });
  }
}
