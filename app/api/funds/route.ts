import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const funds = await db.fund.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(funds)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { code, name, shares, costNav } = await req.json()
  if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 })
  const fund = await db.fund.create({
    data: {
      code: String(code),
      name: String(name),
      shares: Number(shares) || 0,
      costNav: Number(costNav) || 0,
      userId: session.user.id,
    },
  })
  return NextResponse.json(fund)
}
