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

## DBをダンプ
$env:PGPASSWORD='13Ceis31!!'
$env:PGSSLMODE='require' # SSLモードを環境変数で設定

pg_dump `
  -h aws-0-ap-northeast-1.pooler.supabase.com `
  -p 6543 `
  -U postgres.eovedojqpaxcsnerrawn `
  -d postgres `
  -F c `
  -f backup.dump

# コマンドが成功したら、セキュリティのために環境変数を削除します
Remove-Item Env:PGPASSWORD
Remove-Item Env:PGSSLMODE

## DBをリストア
$env:PGPASSWORD='13Ceis31!!'
$env:PGSSLMODE='require'

pg_restore `
  -h aws-0-ap-northeast-1.pooler.supabase.com `
  -p 6543 `
  -U postgres.avavrmljmjecnlkctlca `
  -d postgres `
  -v `
  -c `
  -x `
  -O `
  -n public `
  backup.dump