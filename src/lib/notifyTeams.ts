/* ──────────────────────────────────────────────
   src/lib/notifyTeams.ts
   - Teams Webhook へ投稿するユーティリティ
   - 使い方: notifyTeams(webhookUrl, text) または notifyTeams(text)
   - 環境変数版も後方互換でサポート
────────────────────────────────────────────── */

type NotifyArgs =
  | [string, string]       // (webhookUrl, text)
  | [string];              // (text) → env から URL を取る

/**
 * Teams にカード形式でメッセージを投稿
 * @param args (webhookUrl, text) または (text)
 */
export async function notifyTeams(...args: NotifyArgs): Promise<void> {
  // 引数の解釈
  const webhookUrl = args.length === 2 ? args[0] : process.env.TEAMS_WEBHOOK_URL;
  const text       = args.length === 2 ? args[1] : args[0];

  if (!webhookUrl) {
    throw new Error(
      "▶︎ Webhook URL が指定されていません（引数または TEAMS_WEBHOOK_URL 環境変数）"
    );
  }

  console.log("Teams通知を送信します:", {
    url: webhookUrl,
    text: text
  });

  // Microsoft Teams の “Incoming Webhook” は JSON で { text } を投げるだけ
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
