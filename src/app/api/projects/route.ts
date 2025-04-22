// src/app/api/projects/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

console.log("✅ DATABASE_URL:", process.env.DATABASE_URL);

export async function GET(): Promise<NextResponse> {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
    });
    console.log("🟢 DBから取得したプロジェクト:", projects);
    return NextResponse.json(projects);
  } catch (error: unknown) {
    console.error("GET /api/projects エラー:", error);
    return NextResponse.json([]); // 安全な空配列返却
  }
}
