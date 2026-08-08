import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const goals = await db.goal.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(goals)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { title, description, targetDate } = await req.json()
  if (!title?.trim()) return new NextResponse("标题不能为空", { status: 400 })

  const goal = await db.goal.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      targetDate: targetDate ? new Date(targetDate) : null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(goal, { status: 201 })
}
