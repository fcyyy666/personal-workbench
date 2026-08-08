import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")

  const where: { userId: string; date?: { gte: Date; lt: Date } } = { userId: session.user.id }
  if (year) {
    const y = parseInt(year)
    where.date = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lt: new Date(`${y + 1}-01-01T00:00:00.000Z`),
    }
  }

  const logs = await db.fitnessLog.findMany({
    where,
    orderBy: { date: "desc" },
    ...(year ? {} : { take: 50 }),
  })
  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { type, duration, calories, distance, note, date } = await req.json()
  if (!type || duration == null) return new NextResponse("运动类型必填", { status: 400 })

  const log = await db.fitnessLog.create({
    data: {
      type,
      duration: Number(duration),
      calories: calories ? Number(calories) : null,
      distance: distance ? Number(distance) : null,
      note: note ?? null,
      date: new Date((date ?? new Date().toISOString().split("T")[0]) + "T00:00:00.000Z"),
      userId: session.user.id,
    },
  })
  return NextResponse.json(log, { status: 201 })
}
