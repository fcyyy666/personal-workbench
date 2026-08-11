import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { shares, nav, date, note } = await req.json()

  if (isNaN(Number(shares)) || isNaN(Number(nav)) || Number(shares) <= 0 || Number(nav) <= 0) {
    return NextResponse.json({ error: "Invalid values" }, { status: 400 })
  }

  const fund = await db.fund.findUnique({ where: { id, userId: session.user.id } })
  if (!fund) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const txDate = date ? new Date(date) : new Date()

  await db.fundTransaction.create({
    data: {
      fundId: id,
      shares: Number(shares),
      nav: Number(nav),
      date: txDate,
      note: note ?? null,
    },
  })

  // 重新计算加权平均成本和总份额
  const allTx = await db.fundTransaction.findMany({ where: { fundId: id } })
  const totalShares = allTx.reduce((s, t) => s + t.shares, 0)
  const totalCost = allTx.reduce((s, t) => s + t.shares * t.nav, 0)
  const avgCostNav = totalShares > 0 ? totalCost / totalShares : fund.costNav

  const updated = await db.fund.update({
    where: { id },
    data: { shares: totalShares, costNav: avgCostNav },
  })

  return NextResponse.json(updated)
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const fund = await db.fund.findUnique({ where: { id, userId: session.user.id } })
  if (!fund) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const transactions = await db.fundTransaction.findMany({
    where: { fundId: id },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(transactions)
}
