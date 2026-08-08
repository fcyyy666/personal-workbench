import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const courses = await db.course.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(courses.map(c => ({
    ...c,
    schedule: typeof c.schedule === 'string' ? JSON.parse(c.schedule) : c.schedule
  })))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json()
  const { name, location, color, schedule, teacher, semester } = body

  if (!name?.trim()) return new NextResponse("课程名称必填", { status: 400 })
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return new NextResponse("课程时间必填", { status: 400 })
  }

  const course = await db.course.create({
    data: {
      name: name.trim(),
      location: location?.trim() || null,
      color: color || "#6366F1",
      schedule,
      teacher: teacher?.trim() || null,
      semester: semester?.trim() || null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(course, { status: 201 })
}
