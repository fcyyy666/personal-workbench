import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params
  const body = await req.json()

  const goal = await db.goal.findUnique({ where: { id } })
  if (!goal || goal.userId !== session.user.id) return new NextResponse("Not Found", { status: 404 })

  type MS = { completed: boolean }
  let autoProgress: number | undefined
  let autoStatus: string | undefined

  if (body.milestones !== undefined) {
    const ms = body.milestones as MS[]
    if (ms.length > 0) {
      autoProgress = Math.round(ms.filter(m => m.completed).length / ms.length * 100)
      if (autoProgress >= 100) autoStatus = "COMPLETED"
    }
  }

  const updated = await db.goal.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(autoStatus !== undefined && { status: autoStatus }),
      ...(body.targetDate !== undefined && { targetDate: body.targetDate ? new Date(body.targetDate) : null }),
      ...(body.milestones !== undefined && { milestones: body.milestones }),
      ...(autoProgress !== undefined
        ? { progress: autoProgress }
        : body.progress !== undefined && { progress: Math.min(100, Math.max(0, body.progress)) }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const goal = await db.goal.findUnique({ where: { id } })
  if (!goal || goal.userId !== session.user.id) return new NextResponse("Not Found", { status: 404 })

  await db.goal.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
