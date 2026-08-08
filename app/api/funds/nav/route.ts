import { NextResponse } from "next/server"

interface NavData {
  fundcode: string
  name: string
  jzrq: string   // 净值日期
  dwjz: string   // 单位净值（上一交易日收盘）
  gsz: string    // 估算净值（盘中实时）
  gszzl: string  // 估算涨跌幅(%)
  gztime: string // 估算时间
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const codes = (searchParams.get("codes") ?? "").split(",").filter(Boolean)
  if (codes.length === 0) return NextResponse.json({})

  const results = await Promise.allSettled(
    codes.map(async code => {
      const res = await fetch(
        `http://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,
        { cache: "no-store" }
      )
      const text = await res.text()
      const match = text.match(/jsonpgz\((.+)\)/)
      if (!match) throw new Error("parse failed")
      return { code, ...(JSON.parse(match[1]) as NavData) }
    })
  )

  const navMap: Record<string, Omit<NavData, "fundcode"> & { code: string }> = {}
  results.forEach((r, i) => {
    if (r.status === "fulfilled") navMap[codes[i]] = r.value
  })
  return NextResponse.json(navMap)
}
