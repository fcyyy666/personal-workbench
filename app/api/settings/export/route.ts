import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const userId = session.user.id

  const [tasks, habits, habitLogs, weightLogs, fitnessLogs, funds, goals, courses] = await Promise.all([
    db.task.findMany({ where: { userId } }),
    db.habit.findMany({ where: { userId } }),
    db.habitLog.findMany({ where: { userId } }),
    db.weightLog.findMany({ where: { userId } }),
    db.fitnessLog.findMany({ where: { userId } }),
    db.fund.findMany({ where: { userId } }),
    db.goal.findMany({ where: { userId } }),
    db.course.findMany({ where: { userId } }),
  ])

  const data = {
    exportedAt: new Date().toISOString(),
    tasks,
    habits,
    habitLogs,
    weightLogs,
    fitnessLogs,
    funds,
    goals,
    courses,
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="workbench-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}
