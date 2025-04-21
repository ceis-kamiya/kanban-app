/* ───────────────────────────────────────────────
   src/app/api/tasks/[id]/route.ts
──────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyTeams } from "@/lib/notifyTeams";
import { Status } from "@prisma/client";

/*───────────────────────────────────────────────
  PATCH  /api/tasks/[id]
  - 任意フィールド編集（title / dueDate / assignee / tags / status）
  - ステータス遷移に応じて Teams 通知
───────────────────────────────────────────────*/
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const data: Record<string, any> = {};

    // 更新対象のフィールドを絞り込み
    for (const key of ["title", "dueDate", "assignee", "tags", "status"]) {
      if (key in body) {
        data[key] = body[key];
      }
    }

    // タスクと関連するプロジェクト情報を取得
    const before = await prisma.task.findUnique({
      where: { id },
      include: { project: true }, // プロジェクト情報を含める
    });

    if (!before) {
      return NextResponse.json({ error: "タスクが見つかりません" }, { status: 404 });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "更新項目がありません" }, { status: 400 });
    }

    const after = await prisma.task.update({ where: { id }, data });

    /* ---------- 通知ロジック ---------- */
    const webhookUrl = before.project?.channelWebhookUrl || process.env.TEAMS_WEBHOOK_URL;
    const pm = before.project?.projectManager;   // 責任者
    const assignee = after.assignee;

    if (webhookUrl) {
      /* ステータス変更時: before.status → after.status */
      if (data.status && before.status !== after.status) {
        // ① IN_PROGRESS に入った → 担当者へ
        if (after.status === "IN_PROGRESS") {
          await notifyTeams(
            webhookUrl,
            `@${assignee} さん、タスク **「${after.title}」** が IN_PROGRESS になりました！\n` +
            `期限: ${after.dueDate.toLocaleDateString()}`
          );
        } else {
          // ② それ以外のステータス変更 → PM のみ
          if (pm) {
            await notifyTeams(
              webhookUrl,
              `@${pm} タスク **「${after.title}」** が **${before.status} → ${after.status}** に変更されました。`
            );
          }
        }

        // ③ DONE に変わった瞬間は担当者＋PM
        if (after.status === "DONE" && pm) {
          await notifyTeams(
            webhookUrl,
            `@${assignee} さん、@${pm}\nタスク **「${after.title}」** が完了しました！🎉`
          );
        }
      }

      /* 担当者が変わった場合は担当者＋PM に通知（オプション） */
      if (body.assignee && body.assignee !== before.assignee && pm) {
        await notifyTeams(
          webhookUrl,
          `@${body.assignee} さん、@${pm}\nタスク **「${after.title}」** の担当者が変更されました。`
        );
      }
    }

    return NextResponse.json(after);

  } catch (err: any) {
    console.error("PATCH /api/tasks/[id] エラー:", err);
    return NextResponse.json(
      { error: err?.message ?? "サーバーエラー" },
      { status: err?.status ?? 500 }
    );
  }
}

/*───────────────────────────────────────────────
  DELETE /api/tasks/[id]
───────────────────────────────────────────────*/
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    await prisma.task.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/tasks/[id] エラー:", err);
    return NextResponse.json(
      { error: err?.message ?? "サーバーエラー" },
      { status: err?.status ?? 500 }
    );
  }
}
