import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const userId = session.user.id

  const tasks = await db.task.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  const { title, priority, dueDate } = await req.json()
  if (!title?.trim()) return new NextResponse("标题不能为空", { status: 400 })

  const task = await db.task.create({
    data: {
      title: title.trim(),
      priority: priority ?? "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(task, { status: 201 })
}
