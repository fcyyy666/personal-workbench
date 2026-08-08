import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const log = await db.weightLog.findUnique({ where: { id } })
  if (!log || log.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  await db.weightLog.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const log = await db.weightLog.findUnique({ where: { id } })
  if (!log || log.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  const { weight, note, date } = await req.json()
  if (weight === undefined || isNaN(Number(weight))) return new NextResponse("体重值无效", { status: 400 })
  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new NextResponse("日期格式无效", { status: 400 })
  }
  const updated = await db.weightLog.update({
    where: { id },
    data: {
      weight: Number(weight),
      note: note ?? null,
      date: new Date(date + "T00:00:00.000Z"),
    },
  })
  return NextResponse.json({ ...updated, date: updated.date.toISOString() })
}
