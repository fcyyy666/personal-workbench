import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

function isoWeekNum(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const userId = session.user.id
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const todayDay = today.getDay() // 1=Mon...5=Fri, 0=Sun, 6=Sat
  const isOddWeek = isoWeekNum(today) % 2 === 1

  const [taskCount, habits, latestWeight, activeGoals, courses] = await Promise.all([
    db.task.count({ where: { userId, completed: false } }),
    db.habit.findMany({
      where: { userId, active: true },
      include: { logs: { where: { userId, date: new Date(todayStr + "T00:00:00.000Z") } } },
    }),
    db.weightLog.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
    db.goal.findMany({ where: { userId, status: "ACTIVE" }, select: { progress: true } }),
    db.course.findMany({ where: { userId } }),
  ])

  const habitDone = habits.filter(h => h.logs.length > 0).length
  const avgGoalProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
    : 0

  type ScheduleEntry = { day: number; startPeriod: number; endPeriod: number; weekType: string }
  const todayCourses = courses.flatMap(course => {
    const schedule = (typeof course.schedule === 'string' ? JSON.parse(course.schedule) : course.schedule) as ScheduleEntry[]
    return schedule
      .filter(s => s.day === todayDay && (s.weekType === "all" || (s.weekType === "odd" ? isOddWeek : !isOddWeek)))
      .map(s => ({ id: course.id, name: course.name, location: course.location, color: course.color, startPeriod: s.startPeriod, endPeriod: s.endPeriod }))
  }).sort((a, b) => a.startPeriod - b.startPeriod)

  return NextResponse.json({
    pendingTasks: taskCount,
    habitDone,
    habitTotal: habits.length,
    latestWeight: latestWeight?.weight ?? null,
    activeGoals: activeGoals.length,
    avgGoalProgress,
    todayCourses,
  })
}
