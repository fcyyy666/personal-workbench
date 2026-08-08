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

  const logs = await db.weightLog.findMany({
    where,
    orderBy: { date: "desc" },
    ...(year ? {} : { take: 30 }),
  })
  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { weight, date, note } = await req.json()
  if (!weight || isNaN(Number(weight))) return new NextResponse("体重值无效", { status: 400 })
  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new NextResponse("日期格式无效", { status: 400 })
  }

  const dateObj = new Date(date + "T00:00:00.000Z")
  const log = await db.weightLog.upsert({
    where: { userId_date: { userId: session.user.id, date: dateObj } },
    update: { weight: Number(weight), note: note ?? null },
    create: { userId: session.user.id, weight: Number(weight), date: dateObj, note: note ?? null },
  })
  return NextResponse.json(log, { status: 201 })
}
