/* ────────────────────────────────
   src/types.ts       ― 型定義
───────────────────────────────── */

/** カラム（ステータス） */
export type Status =
  | 'BACKLOG'
  | 'TODO'        // ← 旧UIが参照しているかもしれないので残しておく
  | 'ON_HOLD'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE';

/** プロジェクト情報 */
export interface Project {
  /** プロジェクト ID（UUID 文字列など） */
  id: string;
  /** 表示名 */
  name: string;
  /** プロジェクト責任者（ユーザーID or メール） */
  projectManager: string;
}

/** タスク情報 */
export interface Task {
  /** タスク ID（数値 or UUID） */
  id: number;
  /** どのプロジェクトに属するか */
  projectId: string;
  /** タイトル */
  title: string;
  /** 期日（ISO 文字列） */
  dueDate: string;
  /** 担当者（ユーザーID or メール） */
  assignee: string;
  /** タグ／メモなど */
  tags: string;
  /** 現在のステータス */
  status: Status;
}
