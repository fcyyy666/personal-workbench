import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const log = await db.fitnessLog.findUnique({ where: { id } })
  if (!log || log.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  await db.fitnessLog.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const log = await db.fitnessLog.findUnique({ where: { id } })
  if (!log || log.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  const body = await req.json()
  const updated = await db.fitnessLog.update({
    where: { id },
    data: {
      type: body.type ?? log.type,
      duration: body.duration !== undefined ? Number(body.duration) : log.duration,
      distance: body.distance !== undefined ? (body.distance ? Number(body.distance) : null) : log.distance,
      note: body.note !== undefined ? body.note : log.note,
      date: body.date ? new Date(body.date + "T00:00:00.000Z") : log.date,
    },
  })
  return NextResponse.json({ ...updated, date: updated.date.toISOString() })
}
