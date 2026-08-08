import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    await db.fund.delete({ where: { id, userId: session.user.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { shares, costNav } = await req.json()
  if (isNaN(Number(shares)) || isNaN(Number(costNav))) {
    return NextResponse.json({ error: "Invalid values" }, { status: 400 })
  }
  try {
    const fund = await db.fund.update({
      where: { id, userId: session.user.id },
      data: { shares: Number(shares), costNav: Number(costNav) },
    })
    return NextResponse.json(fund)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
