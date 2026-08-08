"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Dumbbell, Trash2, Plus, ChevronDown, ChevronUp, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface FitnessLog { id: string; type: string; duration: number; distance: number | null; note: string | null; date: string }
interface ExerciseItem { name: string; spec: string }
type PlanExercise = { name: string; spec: string; rest: string }
type WorkoutPlan = { day: number; focus: string; exercises: PlanExercise[] }

const TYPES = [
  { key: "running", label: "跑步", emoji: "👟", primary: true },
  { key: "cycling", label: "骑行", emoji: "🚴", primary: true },
  { key: "basketball", label: "篮球", emoji: "🏀", primary: true },
  { key: "swimming", label: "游泳", emoji: "🏊", primary: true },
  { key: "hiking", label: "徒步", emoji: "🥾", primary: true },
  { key: "strength", label: "力量训练", emoji: "🏋️", primary: false },
  { key: "cardio", label: "有氧训练", emoji: "🏃", primary: false },
  { key: "other", label: "其他", emoji: "⚡", primary: false },
]

const WITH_DISTANCE = ["running", "cycling", "swimming", "hiking", "cardio"]

const WORKOUT_PLANS = [
  {
    day: 1, focus: "胸 + 三头",
    exercises: [
      { name: "平板杠铃卧推", spec: "5×4组", rest: "2'30\"" },
      { name: "哑铃上斜卧推/史密斯上斜卧推", spec: "10×4组", rest: "2'" },
      { name: "龙门架夹胸", spec: "12×4组", rest: "1'30\"" },
      { name: "绳索下拉", spec: "12×4组", rest: "1'" },
      { name: "颈后绳索臂屈伸", spec: "12×4组", rest: "1'" },
      { name: "悬垂举腿", spec: "15×4组", rest: "1'" },
    ],
  },
  {
    day: 2, focus: "背 + 二头",
    exercises: [
      { name: "引体向上", spec: "力竭×4组", rest: "2'30\"" },
      { name: "窄距/宽距对握划船", spec: "12×3组", rest: "1'30\"" },
      { name: "宽距/窄距高位下拉", spec: "12×3组", rest: "1'30\"" },
      { name: "直臂下压", spec: "12×3组", rest: "1'" },
      { name: "山羊挺身", spec: "12×3组", rest: "1'" },
      { name: "哑铃弯举", spec: "12×3组", rest: "1'" },
      { name: "绳索锤式弯举", spec: "12×3组", rest: "1'" },
      { name: "哑铃反握弯举", spec: "12×3组", rest: "1'" },
    ],
  },
  {
    day: 3, focus: "肩 + 腹",
    exercises: [
      { name: "实力推/坐姿哑铃推举", spec: "5×4组", rest: "2'" },
      { name: "绳索面拉", spec: "12×4组", rest: "1'30\"" },
      { name: "哑铃侧平举", spec: "12×4组", rest: "1'30\"" },
      { name: "龙门架绳索侧平举", spec: "12×2组", rest: "1'30\"" },
      { name: "Y字侧平举", spec: "12×2组", rest: "1'30\"" },
      { name: "悬垂举腿", spec: "15×3组", rest: "1'" },
      { name: "悬垂侧举腿", spec: "单侧15×3组", rest: "1'" },
      { name: "卷腹", spec: "20×3组", rest: "1'" },
      { name: "仰卧举腿", spec: "20×3组", rest: "1'" },
    ],
  },
  {
    day: 4, focus: "腿",
    exercises: [
      { name: "底部停顿版深蹲", spec: "5×4组", rest: "2'30\"" },
      { name: "罗马尼亚硬拉", spec: "8-10×4组", rest: "2'30\"" },
      { name: "高脚杯式保加利亚蹲", spec: "8-10×4组", rest: "2'" },
      { name: "内收夹腿", spec: "12×4组", rest: "1'30\"" },
      { name: "坐姿提踵", spec: "20×4组", rest: "1'30\"" },
    ],
  },
]

function parseExercises(note: string | null): ExerciseItem[] | null {
  if (!note) return null
  try {
    const d = JSON.parse(note)
    return Array.isArray(d) && d.length > 0 && "name" in d[0] ? d : null
  } catch { return null }
}

export default function FitnessPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [logs, setLogs] = useState<FitnessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [duration, setDuration] = useState("")
  const [distance, setDistance] = useState("")
  const [note, setNote] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [planHistory, setPlanHistory] = useState<{ version: number; savedAt: string; plan: WorkoutPlan[] }[]>([])
  const [showPlanHistory, setShowPlanHistory] = useState(false)
  const [customPlan, setCustomPlan] = useState<WorkoutPlan[]>(WORKOUT_PLANS)
  const [draftPlan, setDraftPlan] = useState<WorkoutPlan[]>(WORKOUT_PLANS)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState("")
  const [editDuration, setEditDuration] = useState("")
  const [editDistance, setEditDistance] = useState("")
  const [editNote, setEditNote] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editExercises, setEditExercises] = useState<ExerciseItem[]>([])
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("workout-plan")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WorkoutPlan[]
        setCustomPlan(parsed)
        setDraftPlan(parsed)
      } catch { /* ignore */ }
    }
    const savedHistory = localStorage.getItem("workout-plan-history")
    if (savedHistory) {
      try { setPlanHistory(JSON.parse(savedHistory)) } catch {}
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = selectedYear === currentYear ? "/api/fitness" : `/api/fitness?year=${selectedYear}`
    fetch(url).then(r => r.ok ? r.json() : []).then((data: FitnessLog[]) => {
      setLogs(data)
      setLoading(false)
    })
  }, [selectedYear])

  function selectPlan(day: number) {
    if (selectedPlan === day) {
      setSelectedPlan(null); setSelectedType(null); setExercises([]); return
    }
    const plan = customPlan.find(p => p.day === day)!
    setSelectedPlan(day)
    setSelectedType("strength")
    setExercises(plan.exercises.map(({ name, spec }) => ({ name, spec })))
  }

  function handleTypeSelect(key: string) {
    if (selectedType === key) {
      setSelectedType(null); setSelectedPlan(null); setExercises([]); return
    }
    setSelectedType(key)
    setSelectedPlan(null)
    if (key !== "strength") setExercises([])
  }

  function updateExercise(i: number, field: keyof ExerciseItem, value: string) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  function removeExercise(i: number) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  function addExercise() {
    setExercises(prev => [...prev, { name: "", spec: "" }])
  }

  function startEditPlan() {
    setDraftPlan(customPlan.map(p => ({ ...p, exercises: p.exercises.map(e => ({ ...e })) })))
    setEditingPlan(true)
  }

  function savePlan() {
    const newHistory = [...planHistory, { version: planHistory.length + 1, savedAt: new Date().toISOString(), plan: customPlan }]
    localStorage.setItem("workout-plan-history", JSON.stringify(newHistory))
    localStorage.setItem("workout-plan", JSON.stringify(draftPlan))
    setPlanHistory(newHistory)
    setCustomPlan(draftPlan)
    setEditingPlan(false)
  }

  function cancelEditPlan() { setEditingPlan(false) }

  function resetPlan() {
    setDraftPlan(customPlan.map(p => ({ ...p, exercises: p.exercises.map(e => ({ ...e })) })))
  }

  function updateDraftExercise(dayIdx: number, exIdx: number, field: keyof PlanExercise, value: string) {
    setDraftPlan(prev => prev.map((p, i) =>
      i !== dayIdx ? p : { ...p, exercises: p.exercises.map((ex, j) => j !== exIdx ? ex : { ...ex, [field]: value }) }
    ))
  }

  function removeDraftExercise(dayIdx: number, exIdx: number) {
    setDraftPlan(prev => prev.map((p, i) =>
      i !== dayIdx ? p : { ...p, exercises: p.exercises.filter((_, j) => j !== exIdx) }
    ))
  }

  function addDraftExercise(dayIdx: number) {
    setDraftPlan(prev => prev.map((p, i) =>
      i !== dayIdx ? p : { ...p, exercises: [...p.exercises, { name: "", spec: "", rest: "" }] }
    ))
  }

  function updateDraftFocus(dayIdx: number, value: string) {
    setDraftPlan(prev => prev.map((p, i) => i !== dayIdx ? p : { ...p, focus: value }))
  }

  async function createLog(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) return
    const isStrength = selectedType === "strength"
    if (!isStrength && !duration) return
    if (isStrength && exercises.filter(ex => ex.name.trim()).length === 0) return
    setSaving(true)
    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          duration: isStrength ? 0 : Number(duration),
          calories: null,
          distance: distance ? Number(distance) : null,
          note: isStrength ? JSON.stringify(exercises.filter(ex => ex.name.trim())) : (note || null),
          date,
        }),
      })
      if (res.ok) { const log = await res.json(); setLogs(prev => [log, ...prev]) }
      else toast.error("记录保存失败，请重试")
    } catch { toast.error("网络错误，请检查连接") }
    setSelectedType(null); setSelectedPlan(null); setExercises([])
    setDuration(""); setDistance(""); setNote(""); setSaving(false)
  }

  async function deleteLog(id: string) {
    const prev = logs
    setLogs(logs.filter(l => l.id !== id))
    const res = await fetch(`/api/fitness/${id}`, { method: "DELETE" })
    if (!res.ok) { setLogs(prev); toast.error("删除失败，请重试") }
  }

  function startEdit(log: FitnessLog) {
    setEditingId(log.id)
    setEditType(log.type)
    setEditDuration(log.duration > 0 ? String(log.duration) : "")
    setEditDistance(log.distance ? String(log.distance) : "")
    setEditDate(log.date.slice(0, 10))
    const exList = parseExercises(log.note)
    setEditExercises(exList ?? [])
    setEditNote(exList ? "" : (log.note ?? ""))
  }

  function updateEditExercise(i: number, field: keyof ExerciseItem, value: string) {
    setEditExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  function removeEditExercise(i: number) {
    setEditExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  function addEditExercise() {
    setEditExercises(prev => [...prev, { name: "", spec: "" }])
  }

  async function saveEdit(id: string) {
    const isStr = editType === "strength"
    setEditSaving(true)
    try {
      const res = await fetch(`/api/fitness/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editType,
          duration: isStr ? 0 : Number(editDuration),
          distance: editDistance ? Number(editDistance) : null,
          note: isStr ? JSON.stringify(editExercises.filter(ex => ex.name.trim())) : (editNote || null),
          date: editDate,
        }),
      })
      if (res.ok) {
        const updated: FitnessLog = await res.json()
        setLogs(prev => prev.map(l => l.id === id ? updated : l))
        setEditingId(null)
      } else {
        toast.error("保存失败，请重试")
      }
    } catch { toast.error("网络错误，请检查连接") }
    setEditSaving(false)
  }

  const now = new Date()
  const weekStart = new Date(now)
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  weekStart.setDate(now.getDate() - daysToMonday)
  weekStart.setHours(0, 0, 0, 0)
  const weekLogs = logs.filter(l => new Date(l.date) >= weekStart)
  const weekCount = weekLogs.length
  const weekDuration = weekLogs.filter(l => l.duration > 0).reduce((s, l) => s + l.duration, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLogs = logs.filter(l => new Date(l.date) >= monthStart)
  const monthCount = monthLogs.length
  const monthDuration = monthLogs.filter(l => l.duration > 0).reduce((s, l) => s + l.duration, 0)

  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToMonday - (7 - i) * 7)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const count = logs.filter(l => { const d = new Date(l.date); return d >= monday && d <= sunday }).length
    const mM = monday.getMonth() + 1, mD = monday.getDate()
    const sM = sunday.getMonth() + 1, sD = sunday.getDate()
    const mLabel = `${mM}/${mD}`
    const rangeLabel = mM === sM ? `${mM}/${mD}-${sD}` : `${mM}/${mD}-${sM}/${sD}`
    return { week: i === 7 ? "本周" : rangeLabel, range: `${mLabel}-${sM}/${sD}`, count }
  })

  const maxCount = Math.max(...weeklyData.map(d => d.count), 5)
  const yearTotal = logs.length
  const yearDuration = logs.filter(l => l.duration > 0).reduce((s, l) => s + l.duration, 0)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const count = logs.filter(l => new Date(l.date).getMonth() + 1 === month).length
    return { month: `${month}月`, count }
  })
  const monthMaxCount = Math.max(...monthlyData.map(d => d.count), 3)

  const isStrength = selectedType === "strength"

  return (
    <div className="space-y-5">
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

      {selectedYear === currentYear ? (
        <>
          {/* 本周/本月统计 */}
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-zinc-400">本周训练</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{weekCount} <span className="text-sm font-normal text-zinc-400">次</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-zinc-400">本周时长</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{weekDuration} <span className="text-sm font-normal text-zinc-400">分钟</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-zinc-400">本月训练</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{monthCount} <span className="text-sm font-normal text-zinc-400">次</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-zinc-400">本月时长</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{monthDuration} <span className="text-sm font-normal text-zinc-400">分钟</span></p>
              </CardContent>
            </Card>
          </div>
          {/* 近8周趋势 */}
          {logs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">近8周训练频率</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={24} ticks={Array.from({ length: maxCount + 1 }, (_, i) => i)} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #f4f4f5' }}
                      formatter={(v) => [`${v} 次`, '训练次数']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.range ?? ""}
                    />
                    <Bar dataKey="count" fill="#18181b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {loading ? (
            <div className="py-8 text-center text-zinc-400 text-sm">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-sm">{selectedYear} 年暂无训练记录</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-zinc-400">全年训练</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">{yearTotal} <span className="text-sm font-normal text-zinc-400">次</span></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-zinc-400">全年时长</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">{yearDuration} <span className="text-sm font-normal text-zinc-400">分钟</span></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-zinc-400">月均训练</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">{(yearTotal / 12).toFixed(1)} <span className="text-sm font-normal text-zinc-400">次</span></p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{selectedYear} 年各月训练频率</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} width={24} ticks={Array.from({ length: monthMaxCount + 1 }, (_, i) => i)} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #f4f4f5' }}
                        formatter={(v) => [`${v} 次`, '训练次数']}
                      />
                      <Bar dataKey="count" fill="#18181b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* 训练计划 */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPlan(v => !v)}
              className="flex items-center gap-2 text-left"
            >
              <CardTitle className="text-sm font-medium">训练计划</CardTitle>
              {showPlan ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
            </button>
            {showPlan && !editingPlan && (
              <div className="flex items-center gap-3">
                <button type="button" onClick={startEditPlan} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors">编辑</button>
                <button type="button" onClick={resetPlan} className="text-xs text-zinc-300 hover:text-zinc-500 transition-colors">重置修改</button>
              </div>
            )}
            {editingPlan && (
              <div className="flex items-center gap-3">
                <button type="button" onClick={savePlan} className="text-xs font-medium text-zinc-900 hover:opacity-70 transition-opacity">保存</button>
                <button type="button" onClick={cancelEditPlan} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">取消</button>
              </div>
            )}
          </div>
        </CardHeader>
        {showPlan && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(editingPlan ? draftPlan : customPlan).map((plan, dayIdx) => (
                <div key={plan.day}>
                  <div className="border-b border-zinc-100 pb-1 mb-2">
                    {editingPlan ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-zinc-400 shrink-0">Day {plan.day} ·</span>
                        <Input
                          value={plan.focus}
                          onChange={e => updateDraftFocus(dayIdx, e.target.value)}
                          className="h-5 border-0 p-0 text-xs font-semibold text-zinc-700 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-zinc-700">Day {plan.day} · {plan.focus}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {plan.exercises.map((ex, exIdx) => (
                      editingPlan ? (
                        <div key={exIdx} className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Input
                              value={ex.name}
                              onChange={e => updateDraftExercise(dayIdx, exIdx, "name", e.target.value)}
                              placeholder="动作名称"
                              className="flex-1 text-xs h-6 px-1.5 border-zinc-200"
                            />
                            <button type="button" onClick={() => removeDraftExercise(dayIdx, exIdx)}
                              className="text-zinc-300 hover:text-red-400 transition-colors shrink-0">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <Input
                              value={ex.spec}
                              onChange={e => updateDraftExercise(dayIdx, exIdx, "spec", e.target.value)}
                              placeholder="组×次数"
                              className="w-20 text-[10px] h-5 px-1.5 border-zinc-200"
                            />
                            <Input
                              value={ex.rest}
                              onChange={e => updateDraftExercise(dayIdx, exIdx, "rest", e.target.value)}
                              placeholder="休息"
                              className="w-14 text-[10px] h-5 px-1.5 border-zinc-200"
                            />
                          </div>
                        </div>
                      ) : (
                        <div key={exIdx}>
                          <p className="text-xs text-zinc-800 leading-snug">{ex.name}</p>
                          <p className="text-[10px] text-zinc-400">{ex.spec} · 休息{ex.rest}</p>
                        </div>
                      )
                    ))}
                    {editingPlan && (
                      <button type="button" onClick={() => addDraftExercise(dayIdx)}
                        className="flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors">
                        <Plus className="h-2.5 w-2.5" /> 添加动作
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {planHistory.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPlanHistory(v => !v)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPlanHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  历史版本（共 {planHistory.length} 个）
                </button>
                {showPlanHistory && (
                  <div className="mt-3 space-y-3">
                    {[...planHistory].reverse().map(entry => (
                      <div key={entry.version} className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs font-medium text-zinc-500 mb-2">
                          第 {entry.version} 版 · {format(new Date(entry.savedAt), "yyyy年M月d日", { locale: zhCN })}
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {entry.plan.map(plan => (
                            <div key={plan.day}>
                              <p className="text-[10px] font-semibold text-zinc-500 mb-1">Day {plan.day} · {plan.focus}</p>
                              <div className="space-y-0.5">
                                {plan.exercises.map((ex, i) => (
                                  <p key={i} className="text-[10px] text-zinc-400 leading-snug">
                                    {ex.name} <span className="text-zinc-300">{ex.spec}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 记录训练 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Dumbbell className="h-4 w-4" /> 记录训练
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 日期 */}
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40 text-sm" />

          {/* 快速选择训练计划 */}
          <div>
            <p className="text-xs text-zinc-400 mb-2">快速选择训练计划</p>
            <div className="grid grid-cols-4 gap-2">
              {customPlan.map(plan => (
                <button
                  key={plan.day}
                  type="button"
                  onClick={() => selectPlan(plan.day)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-center text-xs transition-colors",
                    selectedPlan === plan.day
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                  )}
                >
                  <div className="font-medium">Day {plan.day}</div>
                  <div className="text-[10px] opacity-70 mt-0.5 leading-tight">{plan.focus}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 运动类型 */}
          <div>
            <p className="text-xs text-zinc-400 mb-2">运动类型</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.filter(t => t.primary).map(t => (
                <button key={t.key} type="button" onClick={() => handleTypeSelect(t.key)}
                  className={cn("rounded-full px-3 py-1 text-sm border transition-colors",
                    selectedType === t.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                  )}>
                  {t.emoji} {t.label}
                </button>
              ))}
              {TYPES.filter(t => !t.primary).map(t => (
                <button key={t.key} type="button" onClick={() => handleTypeSelect(t.key)}
                  className={cn("rounded-full px-3 py-1 text-sm border transition-colors",
                    selectedType === t.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-100 text-zinc-400 hover:border-zinc-300"
                  )}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 表单 — 根据类型变化 */}
          {selectedType && (
            <form onSubmit={createLog} className="space-y-3 pt-1">
              {isStrength ? (
                /* 力量训练：动作列表编辑器，无时长 */
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">训练动作</p>
                  {exercises.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={ex.name}
                        onChange={e => updateExercise(i, "name", e.target.value)}
                        placeholder="动作名称"
                        className="flex-1 text-sm h-8"
                      />
                      <Input
                        value={ex.spec}
                        onChange={e => updateExercise(i, "spec", e.target.value)}
                        placeholder="组×次数"
                        className="w-28 text-sm h-8"
                      />
                      <button type="button" onClick={() => removeExercise(i)}
                        className="text-zinc-300 hover:text-red-400 shrink-0 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addExercise}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                    <Plus className="h-3 w-3" /> 添加动作
                  </button>
                </div>
              ) : (
                /* 其他类型：时长 + 可选距离 + 备注 */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">时长（分钟）</label>
                    <Input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                      placeholder="30" className="w-32 text-sm" min="1" />
                  </div>
                  {WITH_DISTANCE.includes(selectedType) && (
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">距离（公里，可选）</label>
                      <Input type="number" value={distance} onChange={e => setDistance(e.target.value)}
                        placeholder="5.0" className="w-32 text-sm" step="0.1" min="0" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">备注（可选）</label>
                    <Input value={note} onChange={e => setNote(e.target.value)} placeholder="备注..." className="text-sm" />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={saving} size="sm">
                {saving ? "保存中..." : "记录"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 历史记录 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">训练记录</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-zinc-400">加载中...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-zinc-400">还没有训练记录</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const typeLabel = TYPES.find(t => t.key === log.type)
                const exerciseList = parseExercises(log.note)
                const isEditing = editingId === log.id
                const editIsStrength = editType === "strength"
                return (
                  <div key={log.id} className="rounded-lg border border-zinc-100 px-3 py-2.5 group">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap items-center">
                          <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-36 text-sm" />
                          <div className="flex flex-wrap gap-1">
                            {TYPES.map(t => (
                              <button key={t.key} type="button" onClick={() => setEditType(t.key)}
                                className={cn("rounded-full px-2.5 py-0.5 text-xs border transition-colors",
                                  editType === t.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                                )}>
                                {t.emoji} {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {editIsStrength ? (
                          <div className="space-y-1.5">
                            {editExercises.map((ex, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Input value={ex.name} onChange={e => updateEditExercise(i, "name", e.target.value)} placeholder="动作名称" className="flex-1 text-sm h-8" />
                                <Input value={ex.spec} onChange={e => updateEditExercise(i, "spec", e.target.value)} placeholder="组×次数" className="w-28 text-sm h-8" />
                                <button type="button" onClick={() => removeEditExercise(i)} className="text-zinc-300 hover:text-red-400 shrink-0 transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            ))}
                            <button type="button" onClick={addEditExercise} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                              <Plus className="h-3 w-3" /> 添加动作
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            <div>
                              <label className="text-xs text-zinc-400 mb-1 block">时长（分钟）</label>
                              <Input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} placeholder="30" className="w-28 text-sm" />
                            </div>
                            {WITH_DISTANCE.includes(editType) && (
                              <div>
                                <label className="text-xs text-zinc-400 mb-1 block">距离（km）</label>
                                <Input type="number" value={editDistance} onChange={e => setEditDistance(e.target.value)} placeholder="5.0" className="w-24 text-sm" step="0.1" />
                              </div>
                            )}
                            <div className="flex-1 min-w-32">
                              <label className="text-xs text-zinc-400 mb-1 block">备注</label>
                              <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="备注..." className="text-sm" />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(log.id)} disabled={editSaving}>{editSaving ? "保存中..." : "保存"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-zinc-900">
                              {typeLabel?.emoji} {typeLabel?.label ?? log.type}
                            </span>
                            {log.duration > 0 && (
                              <span className="text-xs text-zinc-400">{log.duration} 分钟</span>
                            )}
                            {log.distance && (
                              <span className="text-xs text-zinc-400">{log.distance} km</span>
                            )}
                            <span className="text-xs text-zinc-300">
                              {format(new Date(log.date), "M月d日 EEE", { locale: zhCN })}
                            </span>
                          </div>
                          {exerciseList ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {exerciseList.map((ex, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                                  <span>{ex.name}</span>
                                  <span className="text-zinc-400">{ex.spec}</span>
                                </span>
                              ))}
                            </div>
                          ) : log.note ? (
                            <p className="text-xs text-zinc-400 mt-1 truncate">{log.note}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0 mt-0.5">
                          <button onClick={() => startEdit(log)} className="text-zinc-200 hover:text-zinc-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteLog(log.id)} className="text-zinc-200 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
