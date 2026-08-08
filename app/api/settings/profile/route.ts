import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const { name, image } = await req.json()
  if (name !== undefined && !name?.trim()) return new NextResponse("昵称不能为空", { status: 400 })

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(image !== undefined && { image: image?.trim() || null }),
    },
    select: { id: true, name: true, image: true, email: true },
  })
  return NextResponse.json(user)
}
