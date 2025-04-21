import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 取り組み集プロジェクトを作成
  const project1 = await prisma.project.create({
    data: {
      name: "取り組み集",
      projectManager: "鈴木PM",
      channelWebhookUrl: "https://prod-06.japaneast.logic.azure.com:443/workflows/4902f8c90f9c450b81bf93954dcb23d1/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=NCZ0XacjKiolRBFFD0miqnH1VpvU_lmoEI6wkwq31hg",
      tasks: {
        create: [
          {
            title: "機能A：設計",
            dueDate: new Date("2025-05-01"),
            assignee: "田中",
            status: "IN_PROGRESS",
            tags: "設計,重要",
          },
          {
            title: "機能B：実装",
            dueDate: new Date("2025-05-15"),
            assignee: "佐藤",
            status: "TODO",
            tags: "実装",
          },
          {
            title: "バグ修正",
            dueDate: new Date("2025-04-25"),
            assignee: "山田",
            status: "REVIEW",
            tags: "バグ,緊急",
          }
        ]
      }
    },
  })

  // ものがたりプロジェクトを作成
  const project2 = await prisma.project.create({
    data: {
      name: "ものがたり",
      projectManager: "田中PM",
      channelWebhookUrl: "https://prod-34.japaneast.logic.azure.com:443/workflows/3b27ec71b8d448528761494dbb53d1c5/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=B70CCMQgSpHCTje3SlsH68mViAAN07OaEON3DysO0-c",
      tasks: {
        create: [
          {
            title: "企画立案",
            dueDate: new Date("2025-05-10"),
            assignee: "山田",
            status: "IN_PROGRESS",
            tags: "企画,重要",
          },
          {
            title: "ストーリーボード作成",
            dueDate: new Date("2025-05-20"),
            assignee: "佐藤",
            status: "TODO",
            tags: "デザイン",
          }
        ]
      }
    },
  })

  console.log("サンプルデータを作成しました:", {
    projects: [
      { id: project1.id, name: project1.name },
      { id: project2.id, name: project2.name }
    ]
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })