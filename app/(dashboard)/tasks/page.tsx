"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { CheckSquare, Plus, Trash2, Circle, CheckCircle2, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Habit { id: string; name: string; icon: string; color: string; todayDone: boolean; streak: number; recentLogs: string[] }
type Priority = "LOW" | "MEDIUM" | "HIGH"
interface Task { id: string; title: string; completed: boolean; priority: Priority; dueDate: string | null; createdAt: string }

const priorityLabel: Record<Priority, string> = { LOW: "低", MEDIUM: "中", HIGH: "高" }
const priorityVariant: Record<Priority, "secondary" | "warning" | "destructive"> = { LOW: "secondary", MEDIUM: "warning", HIGH: "destructive" }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Priority>("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [addingHabit, setAddingHabit] = useState(false)
  const [newHabitName, setNewHabitName] = useState("")
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)

  useEffect(() => {
    if (!confirmDeleteKey) return
    const t = setTimeout(() => setConfirmDeleteKey(null), 3000)
    return () => clearTimeout(t)
  }, [confirmDeleteKey])

  useEffect(() => {
    Promise.all([fetchTasks(), fetchHabits()]).finally(() => setLoading(false))
  }, [])

  async function fetchTasks() {
    const res = await fetch("/api/tasks")
    if (res.ok) setTasks(await res.json())
  }

  async function fetchHabits() {
    const res = await fetch("/api/habits")
    if (res.ok) setHabits(await res.json())
  }

  const today = new Date().toISOString().split("T")[0]
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 13 + i)
    return d.toISOString().split("T")[0]
  })

  async function toggleHabit(id: string) {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, todayDone: !h.todayDone } : h))
    await fetch(`/api/habits/${id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    })
    await fetchHabits()
  }

  async function createHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newHabitName.trim()) return
    setSaving(true)
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newHabitName, icon: "⭐", color: "#3B82F6" }),
    })
    if (res.ok) {
      const habit = await res.json()
      setHabits(prev => [...prev, { ...habit, todayDone: false, streak: 0 }])
      setNewHabitName("")
      setAddingHabit(false)
    }
    setSaving(false)
  }

  async function deleteHabit(id: string) {
    const saved = habits
    setHabits(prev => prev.filter(h => h.id !== id))
    const res = await fetch(`/api/habits/${id}`, { method: "DELETE" })
    if (!res.ok) { setHabits(saved); toast.error("删除失败，请重试") }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority, dueDate: dueDate || null }),
      })
      if (res.ok) {
        const t = await res.json()
        setTasks(prev => [t, ...prev])
        setTitle(""); setPriority("MEDIUM"); setDueDate(""); setShowForm(false)
      } else {
        toast.error("创建失败，请重试")
      }
    } catch {
      toast.error("网络错误，请检查连接")
    }
    setSaving(false)
  }

  async function toggleTask(id: string, completed: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t))
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !completed }) })
  }

  async function deleteTask(id: string) {
    const saved = tasks
    setTasks(prev => prev.filter(t => t.id !== id))
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    if (!res.ok) { setTasks(saved); toast.error("删除失败，请重试") }
  }

  const pending = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)
  const doneHabits = habits.filter(h => h.todayDone).length

  return (
    <div className="space-y-6">
      {/* 今日例行事项 */}
      {!loading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-700">今日例行事项</h2>
            <div className="flex items-center gap-3">
              {habits.length > 0 && <span className="text-xs text-zinc-400">{doneHabits}/{habits.length} 已完成</span>}
              <button
                onClick={() => setAddingHabit(v => !v)}
                className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />添加
              </button>
            </div>
          </div>

          {habits.length === 0 && !addingHabit && (
            <p className="text-sm text-zinc-400 py-2">还没有例行事项，点击「添加」创建你的第一条。</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {habits.map(habit => (
              <div
                key={habit.id}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                  habit.todayDone
                    ? "bg-zinc-50 border-zinc-200 opacity-60"
                    : "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                )}
              >
                <button onClick={() => toggleHabit(habit.id)} className="contents">
                  <span className="text-xl">{habit.icon}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={cn("text-sm font-medium truncate", habit.todayDone ? "text-zinc-400 line-through" : "text-zinc-800")}>
                      {habit.name}
                    </p>
                  <div className="flex items-center gap-px mt-0.5 flex-wrap">
                    {last14Days.map(day => (
                      <div key={day} className={cn(
                        "w-2 h-2 rounded-sm shrink-0",
                        (habit.recentLogs ?? []).includes(day) ? "bg-green-400" : "bg-zinc-100"
                      )} />
                    ))}
                    {habit.streak > 0 && <span className="text-xs text-zinc-400 ml-1">🔥{habit.streak}</span>}
                  </div>
                  </div>
                  {habit.todayDone
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    : <Circle className="h-5 w-5 text-zinc-300 shrink-0" />
                  }
                </button>
                <button
                  onClick={() => confirmDeleteKey === `habit-${habit.id}`
                    ? deleteHabit(habit.id)
                    : setConfirmDeleteKey(`habit-${habit.id}`)}
                  className={cn(
                    "sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0 ml-1",
                    confirmDeleteKey === `habit-${habit.id}`
                      ? "text-red-500 opacity-100 text-xs font-medium"
                      : "text-zinc-300 hover:text-red-400"
                  )}
                >
                  {confirmDeleteKey === `habit-${habit.id}` ? "删除?" : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>

          {addingHabit && (
            <form onSubmit={createHabit} className="flex gap-2 mt-2">
              <Input
                placeholder="例行事项名称..."
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                autoFocus
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={saving}>保存</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingHabit(false); setNewHabitName("") }}>取消</Button>
            </form>
          )}
        </div>
      )}

      {/* 待办任务 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">待办任务</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{pending.length} 项待完成</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />新建任务
          </Button>
        </div>

        {showForm && (
          <Card className="mb-3">
            <CardContent className="pt-4">
              <form onSubmit={createTask} className="space-y-3">
                <Input placeholder="任务标题..." value={title} onChange={e => setTitle(e.target.value)} autoFocus required />
                <div className="flex gap-2">
                  <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                    className="flex-1 h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm">
                    <option value="LOW">低优先级</option>
                    <option value="MEDIUM">中优先级</option>
                    <option value="HIGH">高优先级</option>
                  </select>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="flex-1" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving}>保存</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>取消</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-10 text-zinc-400 text-sm">加载中...</div>
        ) : (
          <>
            <div className="space-y-2">
              {pending.length === 0 && !showForm && (
                <Card><CardContent className="py-10 flex flex-col items-center text-zinc-300">
                  <CheckSquare className="h-10 w-10 mb-2" />
                  <p className="text-sm text-zinc-400">全部完成！</p>
                </CardContent></Card>
              )}
              {pending.map(task => (
                <Card key={task.id} className="group">
                  <CardContent className="py-3 flex items-center gap-3">
                    <button onClick={() => toggleTask(task.id, task.completed)} className="shrink-0 text-zinc-300 hover:text-zinc-600">
                      <Circle className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-900 truncate">{task.title}</p>
                      {task.dueDate && (
                        <p className={cn("text-xs mt-0.5",
                          task.dueDate < today ? "text-red-500 font-medium" :
                          task.dueDate === today ? "text-amber-500" : "text-zinc-400"
                        )}>
                          {task.dueDate < today ? "已超期 · " : task.dueDate === today ? "今天截止 · " : ""}
                          {format(new Date(task.dueDate), "M月d日", { locale: zhCN })}
                        </p>
                      )}
                    </div>
                    <Badge variant={priorityVariant[task.priority]}>{priorityLabel[task.priority]}</Badge>
                    <button
                      onClick={() => confirmDeleteKey === `task-${task.id}`
                        ? deleteTask(task.id)
                        : setConfirmDeleteKey(`task-${task.id}`)}
                      className={cn(
                        "sm:opacity-0 sm:group-hover:opacity-100 transition-all",
                        confirmDeleteKey === `task-${task.id}`
                          ? "text-red-500 opacity-100 text-xs font-medium"
                          : "text-zinc-300 hover:text-red-400"
                      )}
                    >
                      {confirmDeleteKey === `task-${task.id}` ? "删除?" : <Trash2 className="h-4 w-4" />}
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {done.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">已完成 ({done.length})</h2>
                <div className="space-y-1.5">
                  {done.map(task => (
                    <Card key={task.id} className="group opacity-60">
                      <CardContent className="py-2.5 flex items-center gap-3">
                        <button onClick={() => toggleTask(task.id, task.completed)} className="shrink-0 text-zinc-400">
                          <CheckSquare className="h-5 w-5" />
                        </button>
                        <p className="flex-1 text-sm text-zinc-400 line-through truncate">{task.title}</p>
                        <button
                          onClick={() => confirmDeleteKey === `task-${task.id}`
                            ? deleteTask(task.id)
                            : setConfirmDeleteKey(`task-${task.id}`)}
                          className={cn(
                            "sm:opacity-0 sm:group-hover:opacity-100 transition-all",
                            confirmDeleteKey === `task-${task.id}`
                              ? "text-red-500 opacity-100 text-xs font-medium"
                              : "text-zinc-300 hover:text-red-400"
                          )}
                        >
                          {confirmDeleteKey === `task-${task.id}` ? "删除?" : <Trash2 className="h-4 w-4" />}
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
