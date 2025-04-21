import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DEPLOY_URL: "https://kanban-app.vercel.app",  // デプロイ時に実際のURLに変更
    PROJECT_BASE_URL: "https://kanban-app.vercel.app/projects"  // プロジェクトページのベースURL
  }
};

export default nextConfig;
