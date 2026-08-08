"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Scale, Plus, Trash2, TrendingDown, TrendingUp, Minus, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { toast } from "sonner"

interface WeightLog { id: string; weight: number; note: string | null; date: string }

function WeightChart({ logs }: { logs: WeightLog[] }) {
  const today = new Date()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    const ds = d.toISOString().split("T")[0]
    const found = logs.find(l => l.date.slice(0, 10) === ds)
    return { ds, weight: found?.weight ?? null }
  })

  const withData = days.filter(d => d.weight !== null) as { ds: string; weight: number }[]
  if (withData.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-zinc-300 text-sm">
        记录 2 条以上数据后显示趋势图
      </div>
    )
  }

  const weights = withData.map(d => d.weight)
  const minW = Math.min(...weights) - 1
  const maxW = Math.max(...weights) + 1
  const range = maxW - minW

  const W = 500; const H = 100; const PX = 10; const PY = 8

  const pts = days.map((d, i) => ({
    x: PX + (i / 13) * (W - PX * 2),
    y: d.weight !== null ? PY + (1 - (d.weight - minW) / range) * (H - PY * 2) : null,
  }))

  const pathSegments: string[] = []
  let cur = ""
  for (const p of pts) {
    if (p.y !== null) {
      cur = cur ? `${cur} L${p.x.toFixed(1)},${p.y.toFixed(1)}` : `M${p.x.toFixed(1)},${p.y.toFixed(1)}`
    } else if (cur) { pathSegments.push(cur); cur = "" }
  }
  if (cur) pathSegments.push(cur)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      {pathSegments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {pts.filter(p => p.y !== null).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y!} r="3.5" fill="#18181b" />
      ))}
    </svg>
  )
}

export default function WeightPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [weight, setWeight] = useState("")
  const [note, setNote] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeight, setEditWeight] = useState("")
  const [editNote, setEditNote] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("weight-target")
    if (saved) setTargetWeight(parseFloat(saved))
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = selectedYear === currentYear ? "/api/weight" : `/api/weight?year=${selectedYear}`
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then((data: WeightLog[]) => { setLogs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedYear])

  async function createLog(e: React.FormEvent) {
    e.preventDefault()
    if (!weight || isNaN(Number(weight))) return
    setSaving(true)
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: Number(weight), date, note }),
      })
      if (res.ok) {
        const log = await res.json()
        setLogs(prev => {
          const filtered = prev.filter(l => l.date.slice(0, 10) !== date)
          return [log, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
        })
        setWeight(""); setNote(""); setShowForm(false)
      } else {
        toast.error("保存失败，请重试")
      }
    } catch {
      toast.error("网络错误，请检查连接")
    }
    setSaving(false)
  }

  async function deleteLog(id: string) {
    const saved = logs
    setLogs(prev => prev.filter(l => l.id !== id))
    const res = await fetch(`/api/weight/${id}`, { method: "DELETE" })
    if (!res.ok) { setLogs(saved); toast.error("删除失败，请重试") }
  }

  function startEditWeight(log: WeightLog) {
    setEditingId(log.id)
    setEditWeight(String(log.weight))
    setEditNote(log.note ?? "")
    setEditDate(log.date.slice(0, 10))
  }

  async function saveEditWeight(id: string) {
    const weightNum = Number(editWeight)
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
      toast.error("体重应在 20–300 kg 之间")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`/api/weight/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: Number(editWeight), note: editNote || null, date: editDate }),
      })
      if (res.ok) {
        const updated: WeightLog = await res.json()
        setLogs(prev => prev.map(l => l.id === id ? updated : l).sort((a, b) => b.date.localeCompare(a.date)))
        setEditingId(null)
      } else {
        toast.error("保存失败，请重试")
      }
    } catch {
      toast.error("网络错误，请检查连接")
    }
    setEditSaving(false)
  }

  function saveTargetWeight() {
    const val = parseFloat(targetInput)
    if (!isNaN(val) && val > 0) {
      setTargetWeight(val)
      localStorage.setItem("weight-target", String(val))
    }
    setEditingTarget(false)
  }

  const latest = logs[0]?.weight ?? null
  const weekAgoLog = logs.find(l => {
    const diff = (Date.now() - new Date(l.date).getTime()) / 86400000
    return diff >= 6 && diff <= 8
  })
  const change = latest !== null && weekAgoLog ? +(latest - weekAgoLog.weight).toFixed(1) : null

  const yearWeights = logs.map(l => l.weight)
  const yearMin = yearWeights.length > 0 ? Math.min(...yearWeights) : null
  const yearMax = yearWeights.length > 0 ? Math.max(...yearWeights) : null
  const yearAvg = yearWeights.length > 0 ? +(yearWeights.reduce((s, w) => s + w, 0) / yearWeights.length).toFixed(1) : null
  const monthlyAvg = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const monthLogs = logs.filter(l => new Date(l.date).getMonth() + 1 === month)
    const avg = monthLogs.length > 0 ? +(monthLogs.reduce((s, l) => s + l.weight, 0) / monthLogs.length).toFixed(1) : null
    return { month: `${month}月`, avg }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">体重记录</h1>
          <p className="text-sm text-zinc-400 mt-0.5">追踪体重变化，坚持健康目标</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />记录体重
        </Button>
      </div>

      {/* 年份选择器 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSelectedYear(y => y - 1)}
          className="rounded-full w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors text-xl leading-none"
        >
          ‹
        </button>
        <span className="text-base font-semibold text-zinc-800 tabular-nums w-20 text-center">{selectedYear} 年</span>
        <button
          type="button"
          onClick={() => setSelectedYear(y => y + 1)}
          disabled={selectedYear >= currentYear}
          className="rounded-full w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xl leading-none"
        >
          ›
        </button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={createLog} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="number" step="0.1" min="20" max="300"
                  placeholder="体重 (kg)" value={weight}
                  onChange={e => setWeight(e.target.value)} autoFocus required className="flex-1"
                />
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1" />
              </div>
              <Input placeholder="备注（可选）" value={note} onChange={e => setNote(e.target.value)} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>保存</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>取消</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selectedYear === currentYear ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>当前体重</CardTitle>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-semibold text-zinc-900">{latest ?? "—"}</span>
                  {latest && <span className="text-sm text-zinc-400">kg</span>}
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>本周变化</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {change === null ? (
                    <span className="text-2xl font-semibold text-zinc-300">—</span>
                  ) : change === 0 ? (
                    <><Minus className="h-5 w-5 text-zinc-400" /><span className="text-2xl font-semibold text-zinc-700">0</span></>
                  ) : change > 0 ? (
                    <><TrendingUp className="h-5 w-5 text-red-400" /><span className="text-2xl font-semibold text-red-500">+{change}</span></>
                  ) : (
                    <><TrendingDown className="h-5 w-5 text-green-500" /><span className="text-2xl font-semibold text-green-600">{change}</span></>
                  )}
                  {change !== null && <span className="text-sm text-zinc-400">kg</span>}
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>目标体重</CardTitle>
                {editingTarget ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Input
                      type="number" step="0.1" min="20" max="300"
                      value={targetInput} onChange={e => setTargetInput(e.target.value)}
                      autoFocus className="w-20 h-7 text-sm px-2"
                      onKeyDown={e => { if (e.key === "Enter") saveTargetWeight(); if (e.key === "Escape") setEditingTarget(false) }}
                    />
                    <button onClick={saveTargetWeight} className="text-xs text-zinc-900 font-medium hover:opacity-70">保存</button>
                    <button onClick={() => setEditingTarget(false)} className="text-xs text-zinc-400 hover:text-zinc-600">取消</button>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-zinc-900">{targetWeight ?? "—"}</span>
                    {targetWeight && <span className="text-sm text-zinc-400">kg</span>}
                    <button
                      onClick={() => { setTargetInput(targetWeight ? String(targetWeight) : ""); setEditingTarget(true) }}
                      className="text-xs text-zinc-300 hover:text-zinc-500 transition-colors ml-auto"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>近14天趋势</CardTitle></CardHeader>
            <CardContent>
              {loading
                ? <div className="h-28 flex items-center justify-center text-zinc-400 text-sm">加载中...</div>
                : <WeightChart logs={logs} />
              }
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {loading ? (
            <div className="py-8 text-center text-zinc-400 text-sm">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-sm">{selectedYear} 年暂无体重记录</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-zinc-400">年度最低</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-zinc-900">{yearMin}</span>
                      <span className="text-sm text-zinc-400">kg</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-zinc-400">年度最高</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-zinc-900">{yearMax}</span>
                      <span className="text-sm text-zinc-400">kg</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-zinc-400">年度平均</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-zinc-900">{yearAvg}</span>
                      <span className="text-sm text-zinc-400">kg</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{selectedYear} 年月均体重趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={monthlyAvg} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={32}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #f4f4f5' }}
                        formatter={(v) => [`${v} kg`, '月均体重']}
                      />
                      <Line
                        type="monotone" dataKey="avg" stroke="#18181b" strokeWidth={2}
                        dot={{ fill: '#18181b', r: 3 }} connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {logs.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
            {selectedYear === currentYear ? "历史记录" : `${selectedYear} 年记录`}
          </h2>
          <div className="space-y-1.5">
            {logs.map(log => (
              <Card key={log.id} className="group">
                {editingId === log.id ? (
                  <CardContent className="py-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                        className="h-7 text-sm px-2 w-36"
                      />
                      <Input
                        type="number" step="0.1" min="20" max="300"
                        value={editWeight} onChange={e => setEditWeight(e.target.value)}
                        placeholder="体重 kg" className="h-7 text-sm px-2 w-24"
                      />
                      <Input
                        value={editNote} onChange={e => setEditNote(e.target.value)}
                        placeholder="备注（可选）" className="h-7 text-sm px-2 flex-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded">取消</button>
                      <button
                        onClick={() => saveEditWeight(log.id)}
                        disabled={editSaving || !editWeight || !editDate}
                        className="text-xs bg-zinc-900 text-white px-3 py-1 rounded hover:bg-zinc-700 disabled:opacity-40"
                      >
                        {editSaving ? "保存中…" : "保存"}
                      </button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="py-2.5 flex items-center gap-3">
                    <Scale className="h-4 w-4 text-zinc-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-zinc-900">{log.weight} kg</span>
                      {log.note && <span className="text-xs text-zinc-400 ml-2">{log.note}</span>}
                    </div>
                    <span className="text-xs text-zinc-400">
                      {format(new Date(log.date), "M月d日", { locale: zhCN })}
                    </span>
                    <button onClick={() => startEditWeight(log)} className="sm:opacity-0 sm:group-hover:opacity-100 text-zinc-300 hover:text-zinc-600 transition-all">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteLog(log.id)} className="sm:opacity-0 sm:group-hover:opacity-100 text-zinc-300 hover:text-red-400 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
