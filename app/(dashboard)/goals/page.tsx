"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Trash2, Plus, X, CheckCircle2, Pause, Play, RotateCcw, Circle } from "lucide-react"

type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED"
interface Milestone { id: string; title: string; completed: boolean }

interface Goal {
  id: string
  title: string
  description: string | null
  targetDate: string | null
  progress: number
  status: GoalStatus
  milestones: Milestone[]
  createdAt: string
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  ACTIVE: "进行中",
  PAUSED: "已暂停",
  COMPLETED: "已完成",
}

const STATUS_COLOR: Record<GoalStatus, string> = {
  ACTIVE: "text-green-600 bg-green-50",
  PAUSED: "text-yellow-600 bg-yellow-50",
  COMPLETED: "text-zinc-400 bg-zinc-100",
}

const GROUPS: { key: GoalStatus; label: string }[] = [
  { key: "ACTIVE", label: "进行中" },
  { key: "PAUSED", label: "已暂停" },
  { key: "COMPLETED", label: "已完成" },
]

const DEFAULT_FORM = { title: "", description: "", targetDate: "" }

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
}

function calcProgress(milestones: Milestone[], manual: number): number {
  if (milestones.length === 0) return manual
  return Math.round(milestones.filter(m => m.completed).length / milestones.length * 100)
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [progressInput, setProgressInput] = useState("")
  const [addingMilestoneFor, setAddingMilestoneFor] = useState<string | null>(null)
  const [milestoneInput, setMilestoneInput] = useState("")
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)

  useEffect(() => {
    if (!confirmDeleteKey) return
    const t = setTimeout(() => setConfirmDeleteKey(null), 3000)
    return () => clearTimeout(t)
  }, [confirmDeleteKey])

  useEffect(() => { fetchGoals() }, [])

  async function fetchGoals() {
    const res = await fetch("/api/goals")
    if (res.ok) {
      const data = await res.json()
      setGoals(data.map((g: Goal) => ({ ...g, milestones: Array.isArray(g.milestones) ? g.milestones : [] })))
    }
    setFetching(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description || null, targetDate: form.targetDate || null }),
      })
      if (res.ok) {
        const goal = await res.json()
        setGoals(prev => [{ ...goal, milestones: [] }, ...prev])
        setForm(DEFAULT_FORM)
        setShowForm(false)
      } else {
        toast.error("添加失败，请重试")
      }
    } catch {
      toast.error("网络错误，请检查连接")
    }
    setLoading(false)
  }

  async function update(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setGoals(prev => prev.map(g => g.id === id ? { ...updated, milestones: Array.isArray(updated.milestones) ? updated.milestones : [] } : g))
    } else {
      toast.error("保存失败，请重试")
    }
  }

  async function deleteGoal(id: string) {
    const saved = goals
    setGoals(prev => prev.filter(g => g.id !== id))
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
    if (!res.ok) { setGoals(saved); toast.error("删除失败，请重试") }
  }

  function commitProgress(id: string) {
    const val = Math.min(100, Math.max(0, parseInt(progressInput) || 0))
    update(id, val === 100 ? { progress: val, status: "COMPLETED" } : { progress: val })
    setEditingId(null)
  }

  function addMilestone(goalId: string) {
    const title = milestoneInput.trim()
    if (!title) return
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const newMilestone: Milestone = { id: crypto.randomUUID(), title, completed: false }
    const newMilestones = [...goal.milestones, newMilestone]
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones: newMilestones } : g))
    setMilestoneInput("")
    setAddingMilestoneFor(null)
    update(goalId, { milestones: newMilestones })
  }

  function toggleMilestone(goalId: string, milestoneId: string) {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const newMilestones = goal.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m)
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones: newMilestones } : g))
    update(goalId, { milestones: newMilestones })
  }

  function deleteMilestone(goalId: string, milestoneId: string) {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const newMilestones = goal.milestones.filter(m => m.id !== milestoneId)
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones: newMilestones } : g))
    update(goalId, { milestones: newMilestones })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">我的目标</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{goals.filter(g => g.status === "ACTIVE").length} 个进行中</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? "取消" : "新增目标"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <Input placeholder="目标名称 *" value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} autoFocus />
              <Input placeholder="备注（可选）" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
              <div className="flex gap-2 items-center">
                <span className="text-xs text-zinc-500 whitespace-nowrap">截止日期</span>
                <input type="date" value={form.targetDate} onChange={e => setForm(v => ({ ...v, targetDate: e.target.value }))}
                  className="flex-1 h-9 px-3 rounded-md border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading || !form.title.trim()}>{loading ? "添加中..." : "确认添加"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM) }}>取消</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {fetching ? (
        <div className="py-20 text-center text-zinc-400 text-sm">加载中...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-sm">还没有目标，点击「新增目标」开始规划吧</p>
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map(({ key, label }) => {
            const grouped = goals.filter(g => g.status === key)
            if (grouped.length === 0) return null
            return (
              <div key={key}>
                <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">{label}</h2>
                <div className="space-y-2">
                  {grouped.map(goal => {
                    const hasMilestones = goal.milestones.length > 0
                    const displayProgress = calcProgress(goal.milestones, goal.progress)
                    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
                    const isOverdue = goal.status === "ACTIVE" && goal.targetDate != null && new Date(goal.targetDate) < todayStart
                    return (
                    <Card key={goal.id} className={cn(`group transition-all`, goal.status === "COMPLETED" ? "opacity-60" : "", isOverdue ? "border-red-200" : "")}>
                      <CardContent className="pb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${goal.status === "COMPLETED" ? "line-through text-zinc-400" : "text-zinc-900"}`}>{goal.title}</p>
                            {goal.description && <p className="text-xs text-zinc-400 mt-0.5 truncate" title={goal.description}>{goal.description}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[goal.status]}`}>{STATUS_LABEL[goal.status]}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Progress value={displayProgress} className="flex-1 h-2" />
                          {!hasMilestones && editingId === goal.id ? (
                            <div className="flex items-center gap-1">
                              <input type="number" min="0" max="100" value={progressInput}
                                onChange={e => setProgressInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") commitProgress(goal.id); if (e.key === "Escape") setEditingId(null) }}
                                autoFocus
                                className="w-12 h-6 text-xs text-center rounded border border-zinc-300 focus:outline-none" />
                              <span className="text-xs text-zinc-400">%</span>
                            </div>
                          ) : (
                            <button
                              onClick={!hasMilestones ? () => { setEditingId(goal.id); setProgressInput(String(displayProgress)) } : undefined}
                              className={cn("text-xs text-zinc-500 w-10 text-right tabular-nums", !hasMilestones && "hover:text-zinc-800")}
                            >
                              {displayProgress}%
                            </button>
                          )}
                        </div>

                        {/* 里程碑列表 */}
                        {hasMilestones && (
                          <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
                            {goal.milestones.map(m => (
                              <div key={m.id} className="group/m flex items-center gap-2">
                                <button onClick={() => toggleMilestone(goal.id, m.id)} className="shrink-0">
                                  {m.completed
                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    : <Circle className="h-3.5 w-3.5 text-zinc-300 hover:text-zinc-500" />
                                  }
                                </button>
                                <span className={cn("flex-1 text-xs", m.completed ? "line-through text-zinc-400" : "text-zinc-600")}>
                                  {m.title}
                                </span>
                                <button onClick={() => deleteMilestone(goal.id, m.id)}
                                  className="sm:opacity-0 sm:group-hover/m:opacity-100 text-zinc-300 hover:text-red-400 transition-all">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 添加里程碑 */}
                        {addingMilestoneFor === goal.id ? (
                          <div className="flex gap-1.5 mt-2">
                            <Input value={milestoneInput} onChange={e => setMilestoneInput(e.target.value)}
                              placeholder="里程碑内容..."
                              onKeyDown={e => { if (e.key === "Enter") addMilestone(goal.id); if (e.key === "Escape") setAddingMilestoneFor(null) }}
                              autoFocus className="h-7 text-xs" />
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => addMilestone(goal.id)}>添加</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAddingMilestoneFor(null)}>取消</Button>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingMilestoneFor(goal.id); setMilestoneInput("") }}
                            className="mt-1.5 flex items-center gap-1 text-xs text-zinc-300 hover:text-zinc-500 transition-colors">
                            <Plus className="h-3 w-3" />添加里程碑
                          </button>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          {goal.targetDate ? (
                            isOverdue
                              ? <span className="text-xs text-red-500 font-medium">已超期 · {fmtDate(goal.targetDate)}</span>
                              : <span className="text-xs text-zinc-400">截止 {fmtDate(goal.targetDate)}</span>
                          ) : (
                            <span className="text-xs text-zinc-400">无截止日期</span>
                          )}
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {goal.status === "ACTIVE" && (
                              <button onClick={() => update(goal.id, { status: "PAUSED" })} title="暂停"
                                className="p-1 rounded text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors">
                                <Pause className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {goal.status === "PAUSED" && (
                              <button onClick={() => update(goal.id, { status: "ACTIVE" })} title="恢复"
                                className="p-1 rounded text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                                <Play className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {goal.status !== "COMPLETED" && (
                              <button onClick={() => update(goal.id, { status: "COMPLETED", progress: 100 })} title="标记完成"
                                className="p-1 rounded text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {goal.status === "COMPLETED" && (
                              <button onClick={() => update(goal.id, { status: "ACTIVE" })} title="重新激活"
                                className="p-1 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => confirmDeleteKey === goal.id ? deleteGoal(goal.id) : setConfirmDeleteKey(goal.id)}
                              title="删除"
                              className={cn(
                                "p-1 rounded transition-colors",
                                confirmDeleteKey === goal.id
                                  ? "text-red-500 text-xs font-medium"
                                  : "text-zinc-400 hover:text-red-500 hover:bg-red-50"
                              )}
                            >
                              {confirmDeleteKey === goal.id ? "确认?" : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
