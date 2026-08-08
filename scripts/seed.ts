import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const user = await db.user.findFirst()
  if (!user) {
    console.error("❌ No user found. Please create an account first.")
    process.exit(1)
  }

  const userId = user.id
  console.log(`🌱 Seeding data for: ${user.name || user.email}`)

  // Clear existing data
  console.log("🧹 Clearing old data...")
  await Promise.all([
    db.task.deleteMany({ where: { userId } }),
    db.habit.deleteMany({ where: { userId } }),
    db.weightLog.deleteMany({ where: { userId } }),
    db.fitnessLog.deleteMany({ where: { userId } }),
    db.fund.deleteMany({ where: { userId } }),
    db.goal.deleteMany({ where: { userId } }),
    db.course.deleteMany({ where: { userId } }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Tasks
  console.log("📝 Creating tasks...")
  await db.task.createMany({
    data: [
      { title: "完成数学作业", description: "微积分习题集第5章", dueDate: new Date(Date.now() + 86400000), priority: "HIGH", userId },
      { title: "准备英语演讲", description: "主题：人工智能的未来", dueDate: new Date(Date.now() + 7 * 86400000), priority: "MEDIUM", userId },
      { title: "读完《深度工作》", completed: true, priority: "LOW", userId },
      { title: "整理实验报告", description: "物理实验数据分析", dueDate: new Date(Date.now() - 2 * 86400000), priority: "HIGH", userId },
      { title: "联系导师讨论论文方向", dueDate: new Date(Date.now() + 3 * 86400000), priority: "MEDIUM", userId },
      { title: "复习线性代数", userId },
    ],
  })

  // Habits
  console.log("⭐ Creating habits...")
  const habits = await Promise.all([
    db.habit.create({ data: { name: "早起锻炼", icon: "🏃", color: "#10B981", userId } }),
    db.habit.create({ data: { name: "背单词", icon: "📖", color: "#3B82F6", userId } }),
    db.habit.create({ data: { name: "阅读30分钟", icon: "📚", color: "#8B5CF6", userId } }),
    db.habit.create({ data: { name: "冥想", icon: "🧘", color: "#EC4899", userId } }),
  ])

  // Habit logs for the past week
  console.log("✅ Creating habit logs...")
  const habitLogs = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() - i * 86400000)
    habitLogs.push(
      { habitId: habits[0].id, userId, date, completed: i < 5 },
      { habitId: habits[1].id, userId, date, completed: i < 4 },
      { habitId: habits[2].id, userId, date, completed: i < 6 },
      { habitId: habits[3].id, userId, date, completed: i < 3 },
    )
  }
  await db.habitLog.createMany({ data: habitLogs })

  // Weight logs
  console.log("⚖️ Creating weight logs...")
  const weights = [70.2, 70.1, 69.8, 70.0, 70.3, 69.9, 70.1]
  await db.weightLog.createMany({
    data: weights.map((w, i) => ({
      weight: w,
      userId,
      date: new Date(today.getTime() - (6 - i) * 86400000),
    })),
  })

  // Fitness logs
  console.log("💪 Creating fitness logs...")
  await db.fitnessLog.createMany({
    data: [
      { type: "跑步", duration: 30, calories: 300, distance: 5.0, userId, date: new Date(today.getTime() - 86400000) },
      { type: "力量训练", duration: 45, calories: 400, note: "胸+三头", userId, date: new Date(today.getTime() - 2 * 86400000) },
      { type: "游泳", duration: 60, calories: 500, distance: 2.0, userId, date: new Date(today.getTime() - 4 * 86400000) },
    ],
  })

  // Funds
  console.log("💰 Creating funds...")
  await db.fund.createMany({
    data: [
      { code: "110011", name: "易方达蓝筹精选混合", shares: 1000, costNav: 1.8532, userId },
      { code: "166005", name: "中欧价值发现混合A", shares: 2000, costNav: 2.4891, userId },
    ],
  })

  // Goals
  console.log("🎯 Creating goals...")
  await db.goal.createMany({
    data: [
      {
        title: "通过英语六级考试",
        description: "目标分数：550+",
        targetDate: new Date(Date.now() + 90 * 86400000),
        progress: 40,
        status: "ACTIVE",
        milestones: JSON.stringify([
          { id: "m1", title: "完成1000词汇", completed: true },
          { id: "m2", title: "模拟考试80分", completed: false },
          { id: "m3", title: "听力提升到70%正确率", completed: false },
        ]),
        userId,
      },
      {
        title: "完成毕业论文",
        description: "深度学习在图像识别中的应用研究",
        targetDate: new Date(Date.now() + 180 * 86400000),
        progress: 25,
        status: "ACTIVE",
        milestones: JSON.stringify([
          { id: "m1", title: "文献综述", completed: true },
          { id: "m2", title: "实验设计", completed: true },
          { id: "m3", title: "初稿完成", completed: false },
          { id: "m4", title: "答辩准备", completed: false },
        ]),
        userId,
      },
    ],
  })

  // Courses
  console.log("📚 Creating courses...")
  await db.course.createMany({
    data: [
      {
        name: "数据结构与算法",
        teacher: "张教授",
        location: "教学楼A201",
        color: "#6366F1",
        schedule: JSON.stringify([
          { day: 1, startPeriod: 1, endPeriod: 2, weekType: "all" },
          { day: 3, startPeriod: 3, endPeriod: 4, weekType: "all" },
        ]),
        userId,
      },
      {
        name: "机器学习",
        teacher: "李教授",
        location: "实验楼B305",
        color: "#10B981",
        schedule: JSON.stringify([
          { day: 2, startPeriod: 3, endPeriod: 4, weekType: "all" },
          { day: 4, startPeriod: 5, endPeriod: 6, weekType: "all" },
        ]),
        userId,
      },
      {
        name: "操作系统",
        teacher: "王教授",
        location: "教学楼A305",
        color: "#F59E0B",
        schedule: JSON.stringify([
          { day: 1, startPeriod: 3, endPeriod: 4, weekType: "odd" },
          { day: 5, startPeriod: 1, endPeriod: 2, weekType: "all" },
        ]),
        userId,
      },
      {
        name: "计算机网络",
        teacher: "赵老师",
        location: "教学楼C102",
        color: "#EF4444",
        schedule: JSON.stringify([
          { day: 2, startPeriod: 1, endPeriod: 2, weekType: "even" },
          { day: 4, startPeriod: 3, endPeriod: 4, weekType: "all" },
        ]),
        userId,
      },
      {
        name: "软件工程",
        location: "教学楼A408",
        color: "#8B5CF6",
        schedule: JSON.stringify([
          { day: 3, startPeriod: 5, endPeriod: 6, weekType: "all" },
        ]),
        userId,
      },
      {
        name: "形势与政策",
        teacher: "刘老师",
        location: "大礼堂",
        color: "#EC4899",
        schedule: JSON.stringify([
          { day: 5, startPeriod: 7, endPeriod: 8, weekType: "all" },
        ]),
        userId,
      },
    ],
  })

  console.log("✅ Seed completed!")
  console.log(`
📊 Summary:
  - 6 tasks (1 completed, 1 overdue)
  - 4 habits with 7 days of logs
  - 7 weight records
  - 3 fitness logs
  - 2 funds
  - 2 goals with milestones
  - 6 courses
  `)
}

main()
  .catch(e => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
