import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// 从截图中提取的基金数据
const fundsData = [
  { code: "012922", name: "易方达全球成长精选混合(QDII)C", shares: 182.03, costNav: 4.2850 },
  { code: "007194", name: "长城短债债券A", shares: 12072.95, costNav: 1.2424 },
  { code: "007195", name: "长城短债债券C", shares: 6102.54, costNav: 1.2290 },
  { code: "019633", name: "国泰半导体设备ETF联接C", shares: 643.48, costNav: 3.7297 },
  { code: "027575", name: "天弘科创芯片设计ETF联接C", shares: 1928.49, costNav: 1.2445 },
  { code: "008087", name: "华夏中证5G通信主题ETF联接C", shares: 703.74, costNav: 3.4104 },
  { code: "022430", name: "华夏中证A500ETF联接A", shares: 3491.48, costNav: 1.2889 },
  { code: "006965", name: "财通安瑞短债债券A", shares: 20246.70, costNav: 1.2348 },
  { code: "006966", name: "财通安瑞短债债券C", shares: 36712.32, costNav: 1.2190 },
  { code: "001480", name: "财通成长优选混合A", shares: 180.85, costNav: 8.2942 },
]

async function main() {
  const user = await db.user.findFirst()
  if (!user) { console.error("❌ 找不到用户"); process.exit(1) }

  console.log(`👤 更新用户: ${user.name || user.email}`)

  for (const f of fundsData) {
    const result = await db.fund.upsert({
      where: { userId_code: { userId: user.id, code: f.code } },
      update: { shares: f.shares, costNav: f.costNav, name: f.name },
      create: { code: f.code, name: f.name, shares: f.shares, costNav: f.costNav, userId: user.id },
    })
    console.log(`✅ ${f.code} ${f.name}: ${f.shares} 份 @ ${f.costNav}`)
  }

  console.log("\n🎉 更新完成！")
}

main()
  .catch(e => { console.error("❌ 失败:", e); process.exit(1) })
  .finally(() => db.$disconnect())
