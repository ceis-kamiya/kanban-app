/* ──────────────────────────────────────────────
   src/lib/notifyTeams.ts
   - Teams Webhook へ投稿するユーティリティ
   - 使い方: notifyTeams(projectId, text)
   - プロジェクトのWebhook URLまたはデフォルトの環境変数を使用
────────────────────────────────────────────── */
import prisma from "./prisma";

/**
 * Teams にカード形式でメッセージを投稿
 * @param projectId プロジェクトID（nullの場合はデフォルトのwebhook URLを使用）
 * @param text 投稿するメッセージ
 */
export async function notifyTeams(projectId: string | null, text: string): Promise<void> {
  let webhookUrl: string | null = null;

  if (projectId) {
    // プロジェクトの環境変数キー名を取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { webhookUrlKey: true }
    });

    // キーから環境変数の値を取得
    if (project?.webhookUrlKey) {
      webhookUrl = process.env[project.webhookUrlKey] || null;
    }
  }

  // プロジェクトのWebhook URLがない場合はデフォルトを使用
  webhookUrl = webhookUrl || process.env.TEAMS_WEBHOOK_URL || null;

  if (!webhookUrl) {
    throw new Error(
      "▶︎ Webhook URLが設定されていません（プロジェクトまたは環境変数 TEAMS_WEBHOOK_URL）"
    );
  }

  console.log("Teams通知を送信します:", {
    projectId,
    webhookUrlKey: projectId ? (await prisma.project.findUnique({
      where: { id: projectId },
      select: { webhookUrlKey: true }
    }))?.webhookUrlKey : 'TEAMS_WEBHOOK_URL',
    text
  });

  // Microsoft Teams の "Incoming Webhook" は JSON で { text } を投げるだけ
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Teams 通知エラー:", res.status, body);
    throw new Error(`Teams 通知に失敗しました (${res.status})`);
  }

  console.log("Teams通知が成功しました");
}
