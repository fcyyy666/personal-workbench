"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Plus, RefreshCw, Trash2, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Fund { id: string; code: string; name: string }
interface NavData { name: string; jzrq: string; dwjz: string; gsz: string; gszzl: string; gztime: string }

export default function FundsPage() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [navMap, setNavMap] = useState<Record<string, NavData>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)

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
    if (!code || !name) return
    if (!/^\d{6}$/.test(code)) { toast.error("基金代码须为6位数字"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      })
      if (res.ok) {
        const fund: Fund = await res.json()
        const newFunds = [fund, ...funds]
        setFunds(newFunds)
        await fetchNavs(newFunds.map(f => f.code))
        setShowForm(false); setCode(""); setName("")
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

  // 涨跌统计
  const stats = funds.reduce((acc, fund) => {
    const nav = navMap[fund.code]
    const change = nav?.gszzl ? parseFloat(nav.gszzl) : null
    if (change === null) acc.flat++
    else if (change > 0) acc.up++
    else if (change < 0) acc.down++
    else acc.flat++
    return acc
  }, { up: 0, down: 0, flat: 0 })

  return (
    <div className="space-y-5">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">基金行情</h1>
          <p className="text-sm text-zinc-400 mt-0.5">关注基金每日表现</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchNavs(funds.map(f => f.code))} disabled={refreshing || funds.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-sm hover:bg-zinc-50 transition-colors disabled:opacity-40">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> 刷新
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "取消" : "关注"}
          </button>
        </div>
      </div>

      {/* 添加表单 */}
      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={addFund} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 mb-1 block">基金代码</label>
                <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onBlur={e => lookupCode(e.target.value)}
                  placeholder="如161725" className="text-sm" maxLength={6} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-400 mb-1 block">基金名称 {lookingUp && <span className="text-zinc-300">查询中...</span>}</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="输入代码后自动填充" className="text-sm" />
              </div>
              <Button type="submit" disabled={saving} size="sm">{saving ? "添加中..." : "关注"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 涨跌概况 */}
      {funds.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pb-4">
              <p className="text-xs text-zinc-400">上涨</p>
              <p className="text-xl font-bold text-red-500 mt-1">{stats.up}<span className="text-sm font-normal ml-0.5">支</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pb-4">
              <p className="text-xs text-zinc-400">下跌</p>
              <p className="text-xl font-bold text-green-600 mt-1">{stats.down}<span className="text-sm font-normal ml-0.5">支</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pb-4">
              <p className="text-xs text-zinc-400">持平</p>
              <p className="text-xl font-bold text-zinc-500 mt-1">{stats.flat}<span className="text-sm font-normal ml-0.5">支</span></p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 行情列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> 行情列表
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? <p className="text-sm text-zinc-400">加载中...</p> : funds.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-zinc-300">
              <TrendingUp className="h-10 w-10 mb-3" />
              <p className="text-sm text-zinc-400">还没有关注的基金</p>
              <p className="text-xs text-zinc-300 mt-1">输入基金代码，自动获取行情数据</p>
            </div>
          ) : (
            <div className="space-y-2">
              {funds.map(fund => {
                const nav = navMap[fund.code]
                const changePct = nav?.gszzl ? parseFloat(nav.gszzl) : null
                const currentNav = nav ? parseFloat(nav.gsz || nav.dwjz) : null
                const isTrading = !!(nav?.gsz && nav?.gszzl && nav?.gztime)
                const isUp = changePct !== null && changePct > 0
                const isDown = changePct !== null && changePct < 0
                return (
                  <div key={fund.id} className="rounded-lg border border-zinc-100 p-3 group hover:border-zinc-200 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900 truncate">{fund.name}</span>
                          <span className="text-xs text-zinc-400">{fund.code}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-400">
                            {isTrading ? `估算 · ${nav!.gztime}` : nav?.jzrq ? `净值 ${nav.jzrq}` : ""}
                          </span>
                          {isTrading && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-500 border border-amber-100">盘中</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => deleteFund(fund.id)}
                          className="text-zinc-200 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="text-right min-w-[80px]">
                          <p className={cn("text-base font-bold tabular-nums", isUp ? "text-red-500" : isDown ? "text-green-600" : "text-zinc-700")}>
                            {currentNav ? currentNav.toFixed(4) : "—"}
                          </p>
                          {changePct !== null && (
                            <p className={cn("text-xs font-medium tabular-nums", isUp ? "text-red-500" : isDown ? "text-green-600" : "text-zinc-400")}>
                              {isUp ? "▲" : isDown ? "▼" : "—"} {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-4 text-xs text-zinc-400 space-y-1">
        <p>📌 数据来源：天天基金公开数据，交易日盘中实时更新</p>
        <p>📌 盘中为估算净值（gsz），收盘后更新为官方净值（dwjz）</p>
        <p>📌 仅供参考，不构成投资建议</p>
      </div>
    </div>
  )
}
