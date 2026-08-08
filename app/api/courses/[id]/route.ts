import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const course = await db.course.findUnique({ where: { id } })
  if (!course || course.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  const body = await req.json()
  const updated = await db.course.update({
    where: { id },
    data: {
      name: body.name ?? course.name,
      location: body.location ?? course.location,
      color: body.color ?? course.color,
      teacher: body.teacher ?? course.teacher,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { id } = await params

  const course = await db.course.findUnique({ where: { id } })
  if (!course || course.userId !== session.user.id) return new NextResponse("Not found", { status: 404 })

  await db.course.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
