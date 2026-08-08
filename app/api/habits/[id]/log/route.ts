import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params
  const { date } = await req.json()

  const habit = await db.habit.findUnique({ where: { id } })
  if (!habit || habit.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  const dateObj = new Date(date + "T00:00:00.000Z")
  const existing = await db.habitLog.findUnique({ where: { habitId_date: { habitId: id, date: dateObj } } })

  if (existing) {
    await db.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ done: false })
  } else {
    await db.habitLog.create({ data: { habitId: id, userId: session.user.id, date: dateObj, completed: true } })
    return NextResponse.json({ done: true })
  }
}
