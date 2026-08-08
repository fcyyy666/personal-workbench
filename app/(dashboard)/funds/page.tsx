"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Plus, RefreshCw, Trash2, X, Upload, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Fund { id: string; code: string; name: string; shares: number; costNav: number }
interface NavData { name: string; jzrq: string; dwjz: string; gsz: string; gszzl: string; gztime: string }
interface ParsedFund { code?: string; name?: string; shares?: string; costNav?: string; rawText?: string }

export default function FundsPage() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [navMap, setNavMap] = useState<Record<string, NavData>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [shares, setShares] = useState("")
  const [costNav, setCostNav] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingFundId, setEditingFundId] = useState<string | null>(null)
  const [editShares, setEditShares] = useState("")
  const [editCostNav, setEditCostNav] = useState("")
  const [editFundSaving, setEditFundSaving] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [parsedFunds, setParsedFunds] = useState<ParsedFund[]>([])
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState("")

  useEffect(() => { loadFunds() }, [])

  async function loadFunds() {
    try {
      const res = await fetch("/api/funds")
      if (res.ok) {
        const data: Fund[] = await res.json()
        setFunds(data)
        if (data.length > 0) await fetchNavs(data.map(f => f.code))
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  async function fetchNavs(codes: string[]) {
    setRefreshing(true)
    const res = await fetch(`/api/funds/nav?codes=${codes.join(",")}`)
    if (res.ok) setNavMap(await res.json())
    setRefreshing(false)
  }

  async function lookupCode(c: string) {
    if (c.length < 5 || name) return
    setLookingUp(true)
    const res = await fetch(`/api/funds/nav?codes=${c}`)
    if (res.ok) {
      const data = await res.json()
      if (data[c]?.name) setName(data[c].name)
    }
    setLookingUp(false)
  }

  async function addFund(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !name || !shares || !costNav) return
    if (!/^\d{6}$/.test(code)) { toast.error("基金代码须为6位数字"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, shares, costNav }),
      })
      if (res.ok) {
        const fund: Fund = await res.json()
        const newFunds = [fund, ...funds]
        setFunds(newFunds)
        await fetchNavs(newFunds.map(f => f.code))
        setShowForm(false); setCode(""); setName(""); setShares(""); setCostNav("")
      } else {
        toast.error("添加失败，请重试")
      }
    } catch {
      toast.error("网络错误，请检查连接")
    }
    setSaving(false)
  }

  async function deleteFund(id: string) {
    const saved = funds
    setFunds(prev => prev.filter(f => f.id !== id))
    const res = await fetch(`/api/funds/${id}`, { method: "DELETE" })
    if (!res.ok) { setFunds(saved); toast.error("删除失败，请重试") }
  }

  function startEditFund(fund: Fund) {
    setEditingFundId(fund.id)
    setEditShares(String(fund.shares))
    setEditCostNav(String(fund.costNav))
  }

  async function saveEditFund(id: string) {
    setEditFundSaving(true)
    try {
      const res = await fetch(`/api/funds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shares: Number(editShares), costNav: Number(editCostNav) }),
      })
      if (res.ok) {
        const updated: Fund = await res.json()
        setFunds(prev => prev.map(f => f.id === id ? updated : f))
        setEditingFundId(null)
      } else {
        toast.error("保存失败，请重试")
      }
    } catch {
      toast.error("网络错误，请检查连接")
    }
    setEditFundSaving(false)
  }

  async function handleBatchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setParsing(true)
    setParseProgress("加载识别引擎...")

    const { recognize } = await import("tesseract.js")
    const results: ParsedFund[] = []

    // 在标签后最近50个字符内找第一个数字（兼容同行/换行两种OCR布局）
    function findAfterLabel(src: string, label: string) {
      const idx = src.indexOf(label)
      if (idx === -1) return undefined
      return src.slice(idx + label.length, idx + label.length + 50).match(/([\d]+\.[\d]+)/)?.[1]
    }

    for (let i = 0; i < files.length; i++) {
      setParseProgress(`识别第 ${i + 1}/${files.length} 张...`)
      const { data: { text } } = await recognize(files[i], "chi_sim+eng")
      // Tesseract 会在汉字间插入空格，归一化后再匹配
      const normalized = text.replace(/([一-鿿])[ \t]+(?=[一-鿿])/g, "$1")

      const code = normalized.match(/\b(\d{6})\b/)?.[1]
      const shares = findAfterLabel(normalized, "持有份额")
      const costNav = findAfterLabel(normalized, "持仓成本价")

      let name: string | undefined
      if (code) {
        try {
          const res = await fetch(`/api/funds/nav?codes=${code}`)
          if (res.ok) {
            const data = await res.json()
            name = data[code]?.name
            if (!name) console.warn(`[NAV] ${code} 返回数据中无 name:`, data)
          } else {
            console.error(`[NAV] ${code} API 返回错误:`, res.status)
          }
        } catch (err) {
          console.error(`[NAV] ${code} 请求失败:`, err)
        }
      }

      // API 境外不可达时，从 OCR 文本中提取基金名称（代码行上方的中文行）
      if (!name && code) {
        const nLines = normalized.split(/\n/).map((l: string) => l.trim()).filter(Boolean)
        const codeIdx = nLines.findIndex((l: string) => l.includes(code))
        if (codeIdx > 0) {
          for (let j = codeIdx - 1; j >= Math.max(0, codeIdx - 3); j--) {
            const cjk = (nLines[j].match(/[一-鿿]/g) || []).length
            if (cjk >= 3) {
              name = nLines[j].replace(/[^一-鿿\w()]/g, '').trim().slice(0, 25)
              break
            }
          }
        }
      }

      results.push({ code, name, shares, costNav, rawText: text })
    }

    setParsedFunds(results)
    setBatchMode(true)
    setParsing(false)
    setParseProgress("")
    e.target.value = ""
  }

  async function saveBatchFunds() {
    const valid = parsedFunds.filter(f => f.code && f.name && f.shares && f.costNav)
    setSaving(true)
    let failed = 0
    for (const fund of valid) {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fund),
      })
      if (!res.ok) failed++
    }
    await loadFunds()
    if (failed > 0) toast.error(`${failed} 条添加失败，请检查数据`)
    setBatchMode(false)
    setParsedFunds([])
    setSaving(false)
  }

  const totals = funds.reduce((acc, fund) => {
    const nav = navMap[fund.code]
    const currentNav = nav ? parseFloat(nav.gsz || nav.dwjz) : fund.costNav
    return {
      cost: acc.cost + fund.shares * fund.costNav,
      current: acc.current + fund.shares * currentNav,
    }
  }, { cost: 0, current: 0 })

  const totalProfit = totals.current - totals.cost
  const totalProfitPct = totals.cost > 0 ? (totalProfit / totals.cost) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">基金</h1>
          <p className="text-sm text-zinc-400 mt-0.5">持仓收益追踪</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchNavs(funds.map(f => f.code))} disabled={refreshing || funds.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-sm hover:bg-zinc-50 transition-colors disabled:opacity-40">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> 刷新
          </button>
          <label className={cn("flex items-center gap-1.5 px-3 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-sm hover:bg-zinc-50 transition-colors cursor-pointer", parsing && "opacity-50 pointer-events-none")}>
            <Upload className="h-3.5 w-3.5" />
            {parsing ? parseProgress || "识别中..." : "批量导入"}
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleBatchUpload} disabled={parsing} />
          </label>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "取消" : "添加持仓"}
          </button>
        </div>
      </div>

      {batchMode && parsedFunds.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">识别结果 — 确认后添加</CardTitle>
              <button onClick={() => { setBatchMode(false); setParsedFunds([]) }} className="text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedFunds.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-zinc-50 border border-zinc-100 relative">
                {f.rawText && (
                  <details className="col-span-4 mb-1">
                    <summary className="text-[10px] text-zinc-400 cursor-pointer select-none">OCR 原始文本 ▸</summary>
                    <pre className="mt-1 text-[9px] text-zinc-500 bg-white border border-zinc-100 rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap break-all">{f.rawText}</pre>
                  </details>
                )}
                <div>
                  <p className="text-[10px] text-zinc-400 mb-1">基金代码</p>
                  <Input value={f.code ?? ""} onChange={e => setParsedFunds(prev => prev.map((p, j) => j === i ? { ...p, code: e.target.value } : p))} placeholder="006479" className="h-7 text-xs" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 mb-1">基金名称</p>
                  <Input value={f.name ?? ""} onChange={e => setParsedFunds(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))} placeholder="自动填充" className="h-7 text-xs" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 mb-1">持有份额</p>
                  <Input value={f.shares ?? ""} onChange={e => setParsedFunds(prev => prev.map((p, j) => j === i ? { ...p, shares: e.target.value } : p))} placeholder="122.79" className="h-7 text-xs" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 mb-1">持仓成本价</p>
                  <Input value={f.costNav ?? ""} onChange={e => setParsedFunds(prev => prev.map((p, j) => j === i ? { ...p, costNav: e.target.value } : p))} placeholder="7.2481" className="h-7 text-xs" />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={saveBatchFunds} disabled={saving}>
                {saving ? "添加中..." : `全部添加（${parsedFunds.filter(f => f.code && f.name && f.shares && f.costNav).length} 条有效）`}
              </Button>
              <button onClick={() => { setBatchMode(false); setParsedFunds([]) }} className="text-sm text-zinc-400 hover:text-zinc-600">取消</button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={addFund} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">基金代码</label>
                  <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onBlur={e => lookupCode(e.target.value)}
                    placeholder="如161725" className="text-sm" maxLength={6} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">基金名称 {lookingUp && <span className="text-zinc-300">查询中...</span>}</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="输入代码后自动填充" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">持有份额</label>
                  <Input type="number" value={shares} onChange={e => setShares(e.target.value)}
                    placeholder="1000.00" className="text-sm" step="0.01" min="0" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">持仓成本价</label>
                  <Input type="number" value={costNav} onChange={e => setCostNav(e.target.value)}
                    placeholder="1.2345" className="text-sm" step="0.0001" min="0" />
                </div>
              </div>
              <Button type="submit" disabled={saving} size="sm">{saving ? "添加中..." : "添加"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {funds.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-zinc-400">持仓成本</p>
              <p className="text-xl font-bold text-zinc-900 mt-1">¥{totals.cost.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-zinc-400">持有金额</p>
              <p className="text-xl font-bold text-zinc-900 mt-1">¥{totals.current.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-zinc-400">持有收益</p>
              <p className={cn("text-xl font-bold mt-1", totalProfit >= 0 ? "text-red-500" : "text-green-600")}>
                {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
              </p>
              <p className={cn("text-xs", totalProfit >= 0 ? "text-red-400" : "text-green-500")}>
                {totalProfitPct >= 0 ? "+" : ""}{totalProfitPct.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> 持仓列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-zinc-400">加载中...</p> : funds.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-zinc-300">
              <TrendingUp className="h-10 w-10 mb-3" />
              <p className="text-sm text-zinc-400">还没有添加基金持仓</p>
              <p className="text-xs text-zinc-300 mt-1">输入基金代码，自动同步天天基金数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {funds.map(fund => {
                const nav = navMap[fund.code]
                const currentNav = nav ? parseFloat(nav.gsz || nav.dwjz) : null
                const navLabel = nav?.gsz ? "估算净值" : "实际净值"
                const cost = fund.shares * fund.costNav
                const current = currentNav ? fund.shares * currentNav : null
                const profit = current ? current - cost : null
                const profitPct = profit && cost > 0 ? (profit / cost) * 100 : null
                return (
                  <div key={fund.id} className="rounded-lg border border-zinc-100 p-3 group">
                    {editingFundId === fund.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900">{fund.name}</span>
                          <span className="text-xs text-zinc-400">{fund.code}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-zinc-400 mb-1 block">持有份额</label>
                            <Input type="number" value={editShares} onChange={e => setEditShares(e.target.value)}
                              step="0.01" min="0" className="h-7 text-sm px-2" />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 mb-1 block">持仓成本价</label>
                            <Input type="number" value={editCostNav} onChange={e => setEditCostNav(e.target.value)}
                              step="0.0001" min="0" className="h-7 text-sm px-2" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingFundId(null)} className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded">取消</button>
                          <button
                            onClick={() => saveEditFund(fund.id)}
                            disabled={editFundSaving || !editShares || !editCostNav}
                            className="text-xs bg-zinc-900 text-white px-3 py-1 rounded hover:bg-zinc-700 disabled:opacity-40"
                          >
                            {editFundSaving ? "保存中…" : "保存"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900">{fund.name}</span>
                              <span className="text-xs text-zinc-400">{fund.code}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                              <span>持有份额 {fund.shares.toFixed(2)}</span>
                              <span>持仓成本价 {fund.costNav.toFixed(4)}</span>
                              {nav && <span className="text-zinc-300">{nav.gztime || nav.jzrq}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                            <button onClick={() => startEditFund(fund)} className="text-zinc-200 hover:text-zinc-600">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteFund(fund.id)} className="text-zinc-200 hover:text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-zinc-50">
                          <div>
                            <p className="text-[10px] text-zinc-400">{navLabel}</p>
                            <p className="text-sm font-medium text-zinc-800">{currentNav ? currentNav.toFixed(4) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400">持仓成本</p>
                            <p className="text-sm font-medium text-zinc-800">¥{cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400">持有金额</p>
                            <p className="text-sm font-medium text-zinc-800">{current ? `¥${current.toFixed(2)}` : "—"}</p>
                          </div>
                          {profit !== null && (
                            <div>
                              <p className="text-[10px] text-zinc-400">持有收益</p>
                              <p className={cn("text-sm font-medium", profit >= 0 ? "text-red-500" : "text-green-600")}>
                                {profit >= 0 ? "+" : ""}{profit.toFixed(2)}
                                <span className="text-[10px] ml-1">({profit >= 0 ? "+" : ""}{profitPct!.toFixed(2)}%)</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-4 text-xs text-zinc-400 space-y-1">
        <p>📌 数据来源：天天基金公开数据，每日收盘后更新</p>
        <p>📌 收益计算：基于你录入的份额和买入净值自动计算</p>
        <p>📌 仅供参考，不构成投资建议</p>
      </div>
    </div>
  )
}
