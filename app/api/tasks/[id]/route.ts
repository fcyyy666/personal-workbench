import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params
  const body = await req.json()

  const task = await db.task.findUnique({ where: { id } })
  if (!task || task.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  const updated = await db.task.update({ where: { id }, data: body })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const task = await db.task.findUnique({ where: { id } })
  if (!task || task.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  await db.task.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
