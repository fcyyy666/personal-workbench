import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

function calcStreak(logs: { date: Date; completed: boolean }[]): number {
  const completed = logs.filter(l => l.completed).map(l => new Date(l.date).toISOString().split("T")[0]).sort().reverse()
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 365; i++) {
    const s = d.toISOString().split("T")[0]
    if (completed.includes(s)) { streak++; d.setDate(d.getDate() - 1) }
    else if (i === 0) { d.setDate(d.getDate() - 1) } // 今天未打卡不断链
    else break
  }
  return streak
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const today = new Date().toISOString().split("T")[0]
  const habits = await db.habit.findMany({
    where: { userId: session.user.id, active: true },
    include: { logs: { where: { userId: session.user.id }, orderBy: { date: "desc" }, take: 60 } },
    orderBy: { createdAt: "asc" },
  })

  const result = habits.map(h => ({
    ...h,
    todayDone: h.logs.some(l => l.date.toISOString().split("T")[0] === today && l.completed),
    streak: calcStreak(h.logs),
    recentLogs: h.logs.filter(l => l.completed).map(l => l.date.toISOString().split("T")[0]),
    logs: undefined,
  }))
  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { name, icon, color } = await req.json()
  if (!name?.trim()) return new NextResponse("名称不能为空", { status: 400 })

  const habit = await db.habit.create({
    data: { name: name.trim(), icon: icon ?? "⭐", color: color ?? "#3B82F6", userId: session.user.id },
  })
  return NextResponse.json(habit, { status: 201 })
}
