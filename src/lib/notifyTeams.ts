// src/lib/notifyTeams.ts
import prisma from "./prisma";

/**
 * Microsoft Teams にカード形式でメッセージを投稿するユーティリティ
 * @param projectId   プロジェクトID（null の場合はデフォルトの WEBHOOK_URL を使用）
 * @param text        投稿するメッセージ本文
 */
export async function notifyTeams(
  projectId: string | null,
  text: string
): Promise<void> {
  let webhookUrl: string | null = null;

  // プロジェクトごとに webhookUrlKey を使い分け
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { webhookUrlKey: true },
    });
    if (project?.webhookUrlKey) {
      webhookUrl = process.env[project.webhookUrlKey] || null;
    }
  }

  // プロジェクトに設定がなければ環境変数 TEAMS_WEBHOOK_URL を使う
  webhookUrl = webhookUrl || process.env.TEAMS_WEBHOOK_URL || null;

  // ← ここでログを出す
  console.log("▶ 使用中の webhookUrl =", webhookUrl);

  if (!webhookUrl) {
    throw new Error(
      "Webhook URL が設定されていません。（プロジェクト or 環境変数 TEAMS_WEBHOOK_URL）"
    );
  }

  console.log("Teams 通知送信:", { projectId, text });

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Teams 通知エラー:", res.status, body);
    throw new Error(`Teams通知に失敗しました (${res.status})`);
  }

  console.log("Teams 通知成功");
}
