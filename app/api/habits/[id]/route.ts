import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const habit = await db.habit.findUnique({ where: { id } })
  if (!habit || habit.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  await db.habit.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
