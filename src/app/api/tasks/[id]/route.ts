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
    const projectUrl = `${process.env.PROJECT_BASE_URL}/${before.projectId}`;
    const appUrl = process.env.DEPLOY_URL || "";

    if (webhookUrl) {
      // 変更内容をテキストで表現
      const changes = [];
      if (data.title && before.title !== after.title) {
        changes.push(`タイトル: "${before.title}" → "${after.title}"`);
      }
      if (data.assignee && before.assignee !== after.assignee) {
        changes.push(`担当者: ${before.assignee} → ${after.assignee}`);
      }
      if (data.dueDate && before.dueDate !== after.dueDate) {
        changes.push(`期限: ${new Date(before.dueDate).toLocaleDateString()} → ${new Date(after.dueDate).toLocaleDateString()}`);
      }
      if (data.tags && before.tags !== after.tags) {
        changes.push(`タグ: ${before.tags || '(なし)'} → ${after.tags || '(なし)'}`);
      }
      if (data.status && before.status !== after.status) {
        changes.push(`ステータス: ${before.status} → ${after.status}`);
      }

      // 共通のフッター
      const footer = `\n\n📱 ${appUrl}\n🔗 ${projectUrl}`;

      // 変更があった場合は通知
      if (changes.length > 0) {
        const changeText = changes.join('\n');
        
        // ステータス変更に応じた特別な通知
        if (data.status && before.status !== after.status) {
          if (after.status === "IN_PROGRESS") {
            // IN_PROGRESSになったら担当者へ
            await notifyTeams(
              webhookUrl,
              `@${assignee}さん\nタスク **「${after.title}」** が IN_PROGRESS になりました！\n\n` +
              `変更内容:\n${changeText}${footer}`
            );
          } else if (after.status === "DONE" && pm) {
            // DONEになったら担当者とPMへ
            await notifyTeams(
              webhookUrl,
              `@${assignee}さん、@${pm}さん\nタスク **「${after.title}」** が完了しました！🎉\n\n` +
              `変更内容:\n${changeText}${footer}`
            );
          } else if (pm) {
            // その他のステータス変更はPMのみ
            await notifyTeams(
              webhookUrl,
              `@${pm}さん\nタスク **「${after.title}」** が更新されました。\n\n` +
              `変更内容:\n${changeText}${footer}`
            );
          }
        } else {
          // 通常の更新通知（担当者とPMへ）
          const targets = [assignee];
          if (pm && pm !== assignee) targets.push(pm);
          
          await notifyTeams(
            webhookUrl,
            `${targets.map(t => `@${t}さん`).join('、')}\n` +
            `タスク **「${after.title}」** が更新されました。\n\n` +
            `変更内容:\n${changeText}${footer}`
          );
        }
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
    
    // 削除前にタスク情報を取得
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!task) {
      return NextResponse.json({ error: "タスクが見つかりません" }, { status: 404 });
    }

    // タスクを削除
    await prisma.task.delete({ where: { id } });

    // 削除通知を送信
    const webhookUrl = task.project?.channelWebhookUrl || process.env.TEAMS_WEBHOOK_URL;
    const pm = task.project?.projectManager;
    const appUrl = process.env.DEPLOY_URL || "";
    const projectUrl = `${process.env.PROJECT_BASE_URL}/${task.projectId}`;

    if (webhookUrl) {
      const targets = [task.assignee];
      if (pm && pm !== task.assignee) targets.push(pm);

      await notifyTeams(
        webhookUrl,
        `${targets.map(t => `@${t}さん`).join('、')}\n` +
        `タスク **「${task.title}」** が削除されました。\n\n` +
        `• 期限: ${new Date(task.dueDate).toLocaleDateString()}\n` +
        `• ステータス: ${task.status}\n` +
        (task.tags ? `• タグ: ${task.tags}\n` : '') +
        `\n📱 ${appUrl}\n🔗 ${projectUrl}`
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/tasks/[id] エラー:", err);
    return NextResponse.json(
      { error: err?.message ?? "サーバーエラー" },
      { status: err?.status ?? 500 }
    );
  }
}
