import { NextResponse } from "next/server"

interface NavData {
  name: string
  jzrq: string   // 净值日期
  dwjz: string   // 单位净值（上一交易日收盘）
  gsz: string    // 估算净值（盘中实时）
  gszzl: string  // 估算涨跌幅(%)
  gztime: string // 估算时间
}

interface SinaLine {
  name: string
  gztime: string  // 时间(HH:MM:SS) — 实际估算时间
  gsz: string
  yesterday: string
  changeAmt: string
  gszzl: string
  jzrq: string
  dwjz: string
  officialPct: string
}

// 1. Sina 盘中估算：https://hq.sinajs.cn/list=fu_012922
// 响应是 GB18030 编码，需要手动解码
// 字段: 名称,时间(HH:MM:SS),估算净值,?,昨日净值,估算涨跌额,估算涨跌幅(%),净值日期,单位净值,涨跌幅(%)
async function fetchSina(code: string): Promise<SinaLine | null> {
  try {
    const res = await fetch(
      `http://hq.sinajs.cn/list=fu_${code}`,
      {
        cache: "no-store",
        headers: { Referer: "https://finance.sina.com.cn" },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const text = new TextDecoder("gb18030").decode(buf)
    const m = text.match(/="([^"]*)"/)
    if (!m || !m[1]) return null
    const parts = m[1].split(",")
    if (parts.length < 10) return null
    return {
      name: parts[0],
      gztime: parts[1],
      gsz: parts[2],
      yesterday: parts[4],
      changeAmt: parts[5],
      gszzl: parts[6],
      jzrq: parts[7],
      dwjz: parts[8],
      officialPct: parts[9],
    }
  } catch {
    return null
  }
}

interface EmRecord {
  FSRQ: string
  DWJZ: string
  JZZZL: string
}

// 3. Eastmoney 基金搜索（用于债券基金等 Sina 没数据的名称兜底）
async function fetchNameFromSuggest(code: string): Promise<string> {
  try {
    const res = await fetch(
      `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?key=${code}&m=1`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return ""
    const json = (await res.json()) as { Datas?: Array<{ NAME?: string; CATEGORYDESC?: string }> }
    const item = json.Datas?.[0]
    return item?.NAME ? `${item.NAME}` : ""
  } catch {
    return ""
  }
}

// 2. Eastmoney F10 官方历史净值：https://api.fund.eastmoney.com/f10/lsjz
async function fetchEastmoney(code: string): Promise<EmRecord | null> {
  try {
    const res = await fetch(
      `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`,
      {
        cache: "no-store",
        headers: { Referer: "https://fund.eastmoney.com/" },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const json = (await res.json()) as { Data?: { LSJZList?: EmRecord[] } }
    const rec = json.Data?.LSJZList?.[0]
    if (!rec?.DWJZ) return null
    return rec
  } catch {
    return null
  }
}

async function fetchOne(code: string): Promise<(NavData & { name: string }) | null> {
  const [sina, em] = await Promise.all([fetchSina(code), fetchEastmoney(code)])

  // 没有任何数据
  if (!sina && !em) return null

  // 取官方净值（Eastmoney 一定有，实时 Sina 也会有，取最新）
  const dwjz = em?.DWJZ ?? sina?.dwjz ?? ""
  const jzrq = em?.FSRQ ?? sina?.jzrq ?? ""

  // 名称优先 Sina（含币种说明），否则用 Eastmoney 搜索兜底（债基等）
  let finalName = sina?.name ?? ""
  if (!finalName) finalName = await fetchNameFromSuggest(code)

  if (!sina) {
    // 纯官方净值（债基等无估算）
    return {
      name: finalName,
      jzrq,
      dwjz,
      gsz: "",
      gszzl: em?.JZZZL ?? "0",
      gztime: "",
    }
  }

  // Sina 有数据：盘中用估算，收盘用官方
  return {
    name: finalName,
    jzrq: jzrq || sina.jzrq,
    dwjz: dwjz || sina.dwjz,
    gsz: sina.gsz,
    gszzl: sina.gszzl,
    gztime: sina.gztime,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const codes = (searchParams.get("codes") ?? "").split(",").filter(Boolean)
  if (codes.length === 0) return NextResponse.json({})

  const results = await Promise.allSettled(codes.map(c => fetchOne(c)))
  const out: Record<string, NavData & { name: string }> = {}
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) out[codes[i]] = r.value
  })
  return NextResponse.json(out)
}
