import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    include: { tasks: true },
  });

  writeFileSync("data.json", JSON.stringify(projects, null, 2), "utf-8");
  console.log("✅ data.json にローカルデータを書き出しました！");
}

main()
  .catch((e) => {
    console.error("❌ エクスポート失敗:", e);
  })
  .finally(() => {
    prisma.$disconnect();
  });
