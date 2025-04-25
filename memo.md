## GitHubへの保存
git add .
git commit -m "コメント"
git push

## リモートのoriginの最新の変更を取得
git fetch origin

## origin/masterの状態に戻す（リモートのorigin/masterに戻したければ先にfetch origin）
git reset --hard origin/master

## 現在のブランチの確認
git branch

## ブランチの移動
git chechout ブランチ名（またはコミットのハッシュ）

## GitHubからのクローン
git clone https://github.com/ユーザー名/リポジトリ名.git

## デプロイ（Vercelで）

## ローカルで起動
npm run dev

## prisma studio起動
npx prisma studio

## コードを1ファイルにまとめる
npx repomix