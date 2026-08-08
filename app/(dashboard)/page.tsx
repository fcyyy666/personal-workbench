"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckSquare, Scale, TrendingUp, Flag, BookOpen, Circle, Dumbbell } from "lucide-react"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getGreeting } from "@/lib/utils"

interface TodayCourse { id: string; name: string; location: string | null; color: string | null; startPeriod: number; endPeriod: number }
interface DashboardData {
  pendingTasks: number; latestWeight: number | null
  activeGoals: number; avgGoalProgress: number; todayCourses: TodayCourse[]
}
interface Task { id: string; title: string; completed: boolean; priority: string; dueDate: string | null }
interface Fund { id: string; code: string; name: string; shares: number; costNav: number; currentNav: number | null }
interface Goal { id: string; title: string; progress: number; status: string; targetDate: string | null }
interface FitnessLog { id: string; date: string }

const PERIOD_LABEL: Record<number, string> = { 1: "第1-2节", 3: "第3-4节", 5: "第5-6节", 7: "第7-8节", 9: "第9-10节", 11: "第11-12节" }

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [fitnessLogs, setFitnessLogs] = useState<FitnessLog[]>([])
  const [loading, setLoading] = useState(true)
  const greeting = getGreeting()

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/dashboard").then(r => r.json()),
      fetch("/api/tasks").then(r => r.json()),
      fetch("/api/funds").then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
      fetch("/api/fitness").then(r => r.json()),
    ]).then(([s, t, f, g, fit]) => {
      if (s.status === "fulfilled") setSummary(s.value)
      if (t.status === "fulfilled") setTasks((t.value as Task[]).filter(task => !task.completed).slice(0, 5))
      if (f.status === "fulfilled") setFunds(f.value)
      if (g.status === "fulfilled") setGoals((g.value as Goal[]).filter(goal => goal.status === "ACTIVE").slice(0, 4))
      if (fit.status === "fulfilled") setFitnessLogs(fit.value)
      setLoading(false)
    })
  }, [])

  async function toggleTask(id: string, completed: boolean) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !completed }) })
    if (summary) setSummary({ ...summary, pendingTasks: summary.pendingTasks - 1 })
  }

  const fundTotal = funds.reduce((sum, f) => sum + (f.currentNav || f.costNav) * f.shares, 0)

  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekMonday = new Date(now)
  weekMonday.setDate(now.getDate() - daysToMonday)
  weekMonday.setHours(0, 0, 0, 0)
  const weekFitnessCount = fitnessLogs.filter(l => new Date(l.date) >= weekMonday).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{greeting} 👋</h1>
        <p className="text-sm text-zinc-400 mt-0.5">欢迎回来</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatsCard title="待完成任务" value={loading ? "..." : summary ? String(summary.pendingTasks) : "—"} icon={CheckSquare} iconColor="text-blue-400" sub={summary?.pendingTasks === 0 ? "全部完成" : "项待处理"} href="/tasks" />
        <StatsCard title="当前体重" value={loading ? "..." : summary?.latestWeight ? `${summary.latestWeight} kg` : "未记录"} icon={Scale} iconColor="text-violet-400" href="/weight" />
        <StatsCard title="本周训练" value={loading ? "..." : fitnessLogs.length === 0 ? "—" : `${weekFitnessCount} 次`} icon={Dumbbell} iconColor="text-emerald-400" sub={fitnessLogs.length === 0 ? "未记录" : undefined} href="/fitness" />
        <StatsCard title="进行中目标" value={loading ? "..." : summary ? String(summary.activeGoals) : "—"} icon={Flag} iconColor="text-orange-400" sub={summary && summary.activeGoals > 0 ? `平均 ${summary.avgGoalProgress}%` : undefined} href="/goals" />
        <StatsCard title="基金持仓" value={loading ? "..." : funds.length === 0 ? "—" : `¥${fundTotal.toFixed(2)}`} icon={TrendingUp} iconColor="text-rose-400" sub={funds.length === 0 ? "未添加" : `${funds.length} 支基金`} href="/funds" />
        <StatsCard title="今日课程" value={loading ? "..." : summary ? String(summary.todayCourses.length) : "—"} icon={BookOpen} iconColor="text-indigo-400" sub={!summary ? undefined : summary.todayCourses.length === 0 ? "今日无课" : "节课"} href="/courses" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>待办任务</CardTitle>
              <Link href="/tasks" className="text-xs text-zinc-400 hover:text-zinc-600">全部 →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-6 text-zinc-400 text-sm">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>暂无待办任务</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-50">
                    <button onClick={() => toggleTask(t.id, t.completed)} className="text-zinc-300 hover:text-zinc-600 shrink-0">
                      <Circle className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-zinc-700 flex-1 truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>目标进度</CardTitle>
              <Link href="/goals" className="text-xs text-zinc-400 hover:text-zinc-600">全部 →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-6 text-zinc-400 text-sm">
                <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>暂无进行中目标</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map(g => (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-700 truncate flex-1">{g.title}</span>
                      <span className="text-xs text-zinc-400 tabular-nums ml-2 shrink-0">{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} className="h-2" />
                    {g.targetDate && (
                      <p className="text-xs text-zinc-400">截止 {new Date(g.targetDate).toLocaleDateString("zh-CN")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
