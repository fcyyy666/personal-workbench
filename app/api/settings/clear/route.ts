import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

type Module = "tasks" | "habits" | "weight" | "fitness" | "funds" | "goals" | "courses"

const deleteByModule: Record<Module, (userId: string) => Promise<unknown>> = {
  tasks: (id) => db.task.deleteMany({ where: { userId: id } }),
  habits: (id) => db.habit.deleteMany({ where: { userId: id } }),
  weight: (id) => db.weightLog.deleteMany({ where: { userId: id } }),
  fitness: (id) => db.fitnessLog.deleteMany({ where: { userId: id } }),
  funds: (id) => db.fund.deleteMany({ where: { userId: id } }),
  goals: (id) => db.goal.deleteMany({ where: { userId: id } }),
  courses: (id) => db.course.deleteMany({ where: { userId: id } }),
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const module = searchParams.get("module") as Module

  if (!module || !deleteByModule[module]) {
    return new NextResponse("无效的模块", { status: 400 })
  }

  await deleteByModule[module](session.user.id)
  return NextResponse.json({ ok: true })
}
