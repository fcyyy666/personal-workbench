import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return new NextResponse("No file", { status: 400 })
  if (!file.type.startsWith("image/")) return new NextResponse("Invalid file type", { status: 400 })
  if (file.size > 2 * 1024 * 1024) return new NextResponse("文件不能超过 2MB", { status: 400 })

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
  const filename = `avatar-${session.user.id}-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads")

  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  const imageUrl = `/uploads/${filename}`
  await db.user.update({ where: { id: session.user.id }, data: { image: imageUrl } })

  return NextResponse.json({ url: imageUrl })
}
