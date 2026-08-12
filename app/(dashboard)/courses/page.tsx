"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, X, Pencil } from "lucide-react"

type ScheduleEntry = {
  day: number
  startPeriod: number
  endPeriod: number
  weekType: "all" | "odd" | "even"
}

type Course = {
  id: string
  name: string
  location: string | null
  color: string | null
  schedule: ScheduleEntry[]
}

const PERIOD_BLOCKS = [
  { label: "第1-2节", start: 1, end: 2 },
  { label: "第3-4节", start: 3, end: 4 },
  { label: "第5-6节", start: 5, end: 6 },
  { label: "第7-8节", start: 7, end: 8 },
  { label: "第9-10节", start: 9, end: 10 },
  { label: "第11-12节", start: 11, end: 12 },
]

const DAYS = ["周一", "周二", "周三", "周四", "周五"]

function isoWeekNum(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const COLORS = [
  "#6366F1", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
]

const DEFAULT_FORM = {
  name: "",
  location: "",
  day: "1",
  startBlock: "0",
  endBlock: "0",
  weekType: "all" as "all" | "odd" | "even",
  color: "#6366F1",
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedWeek, setSelectedWeek] = useState(() => isoWeekNum(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", location: "", color: "#6366F1" })
  const [semesterStartWeek, setSemesterStartWeek] = useState<number>(() => {
    if (typeof window === "undefined") return isoWeekNum(new Date())
    const saved = localStorage.getItem("semester-start-week")
    return saved ? parseInt(saved) : isoWeekNum(new Date())
  })
  const [editingSemester, setEditingSemester] = useState(false)
  const [semesterInput, setSemesterInput] = useState("")

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    const res = await fetch("/api/courses")
    if (res.ok) setCourses(await res.json())
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const block = PERIOD_BLOCKS[parseInt(form.startBlock)]
    const blockEnd = PERIOD_BLOCKS[parseInt(form.endBlock)]
    setLoading(true)
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: form.location || null,
          color: form.color,
          schedule: [{
            day: parseInt(form.day),
            startPeriod: block.start,
            endPeriod: blockEnd.end,
            weekType: form.weekType,
          }],
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm(DEFAULT_FORM)
        fetchCourses()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setCourses(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/courses/${id}`, { method: "DELETE" })
  }

  function startEdit(c: Course) {
    setEditingId(c.id)
    setEditForm({ name: c.name, location: c.location ?? "", color: c.color ?? "#6366F1" })
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !editForm.name.trim()) return
    const res = await fetch(`/api/courses/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, location: editForm.location || null, color: editForm.color }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCourses(prev => prev.map(c => c.id === editingId ? { ...c, ...updated } : c))
      setEditingId(null)
    }
  }

  const semesterWeek = Math.max(1, selectedWeek - semesterStartWeek + 1)
  const isOdd = semesterWeek % 2 === 1

  function getCellCourses(dayIndex: number, block: typeof PERIOD_BLOCKS[0]) {
    const day = dayIndex + 1
    return courses.filter(c =>
      c.schedule.some(s =>
        s.day === day &&
        s.startPeriod <= block.end &&
        s.endPeriod >= block.start &&
        (s.weekType === "all" || (s.weekType === "odd" && isOdd) || (s.weekType === "even" && !isOdd))
      )
    )
  }

  function getWeekBadge(course: Course, day: number, block: typeof PERIOD_BLOCKS[0]) {
    const s = course.schedule.find(e =>
      e.day === day && e.startPeriod <= block.end && e.endPeriod >= block.start
    )
    if (!s || s.weekType === "all") return null
    return s.weekType === "odd" ? "单" : "双"
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">课程安排</h1>
          <p className="text-sm text-zinc-400 mt-0.5">当前学期课表</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? "收起" : "添加课程"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pb-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">课程名称 *</label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="如：高等数学"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">上课地点</label>
                  <Input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="如：教学楼A301"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">星期</label>
                  <select
                    value={form.day}
                    onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    {DAYS.map((d, i) => (
                      <option key={i} value={String(i + 1)}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">开始节次</label>
                  <select
                    value={form.startBlock}
                    onChange={e => setForm(f => ({ ...f, startBlock: e.target.value, endBlock: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    {PERIOD_BLOCKS.map((b, i) => (
                      <option key={i} value={String(i)}>{b.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">结束节次</label>
                  <select
                    value={form.endBlock}
                    onChange={e => setForm(f => ({ ...f, endBlock: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    {PERIOD_BLOCKS.map((b, i) => (
                      <option key={i} value={String(i)} disabled={i < parseInt(form.startBlock)}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">单双周</label>
                  <select
                    value={form.weekType}
                    onChange={e => setForm(f => ({ ...f, weekType: e.target.value as "all" | "odd" | "even" }))}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    <option value="all">每周</option>
                    <option value="odd">单周</option>
                    <option value="even">双周</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">颜色</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM) }}>取消</Button>
                <Button type="submit" size="sm" disabled={loading || !form.name.trim()}>
                  {loading ? "保存中..." : "添加"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center gap-3 bg-zinc-900 text-white rounded-xl px-4 py-3">
        <span className="text-sm text-zinc-400 whitespace-nowrap">查看周次</span>
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(Number(e.target.value))}
          className="flex-1 bg-zinc-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 cursor-pointer"
        >
          {Array.from({ length: 19 }, (_, i) => i + 1).map(w => {
            const sw = w - semesterStartWeek + 1
            return (
              <option key={w} value={w}>
                第 {w} 周{sw >= 1 && sw <= 30 ? `（学期第${sw}周）` : ""}
              </option>
            )
          })}
        </select>
        {editingSemester ? (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-zinc-500">起始第</span>
            <input
              type="number" min="1" max="53"
              value={semesterInput}
              onChange={e => setSemesterInput(e.target.value)}
              onBlur={() => {
                const v = parseInt(semesterInput)
                if (v >= 1 && v <= 53) { setSemesterStartWeek(v); localStorage.setItem("semester-start-week", String(v)) }
                setEditingSemester(false)
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const v = parseInt(semesterInput)
                  if (v >= 1 && v <= 53) { setSemesterStartWeek(v); localStorage.setItem("semester-start-week", String(v)) }
                  setEditingSemester(false)
                }
              }}
              autoFocus
              className="w-10 bg-zinc-800 text-white text-xs rounded px-1.5 py-1 border border-zinc-600 focus:outline-none"
            />
            <span className="text-xs text-zinc-500">周</span>
          </div>
        ) : (
          <button
            onClick={() => { setEditingSemester(true); setSemesterInput(String(semesterStartWeek)) }}
            className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap shrink-0"
          >
            起始 {semesterStartWeek} 周
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full table-fixed text-xs min-w-[480px]">
            <colgroup>
              <col className="w-[72px]" />
              {DAYS.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-3 py-2.5 text-zinc-400 font-normal text-center">节次</th>
                {DAYS.map((d, i) => (
                  <th key={i} className="px-2 py-2.5 text-zinc-600 font-medium text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIOD_BLOCKS.map((block, bi) => (
                <tr key={bi} className="border-b border-zinc-50 last:border-b-0">
                  <td className="px-3 py-2 text-center text-zinc-400 border-r border-zinc-100 whitespace-nowrap">
                    {block.label}
                  </td>
                  {[0, 1, 2, 3, 4].map(di => {
                    const cellCourses = getCellCourses(di, block)
                    return (
                      <td key={di} className="px-1 py-1 align-top border-r border-zinc-50 last:border-r-0">
                        <div className="min-h-[52px] space-y-1">
                          {cellCourses.map(c => {
                            const wb = getWeekBadge(c, di + 1, block)
                            return (
                              <div
                                key={c.id}
                                className="rounded px-1.5 py-1 text-white relative group"
                                style={{ backgroundColor: c.color ?? "#6366F1" }}
                              >
                                <div className="flex items-start gap-1">
                                  <p className="font-medium leading-tight flex-1 break-words">{c.name}</p>
                                  <button
                                    onClick={() => handleDelete(c.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                {c.location && (
                                  <p className="opacity-75 text-[10px] mt-0.5 leading-tight">{c.location}</p>
                                )}
                                {wb && (
                                  <span className="text-[9px] bg-white/25 rounded px-0.5 mt-0.5 inline-block">{wb}周</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {courses.length === 0 && (
        <p className="text-xs text-zinc-400 text-center py-2">暂无课程，点击「添加课程」开始录入</p>
      )}
      {courses.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-2">已添加 {courses.length} 门课程</p>
          {editingId && (
            <Card className="mb-3">
              <CardContent className="pt-3 pb-3">
                <form onSubmit={handleEditSave} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">课程名称</label>
                      <Input
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="课程名称"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">上课地点</label>
                      <Input
                        value={editForm.location}
                        onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="如：教学楼A101"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">颜色</label>
                    <div className="flex gap-2">
                      {COLORS.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, color: col }))}
                          className="w-6 h-6 rounded border-2 transition-all"
                          style={{
                            backgroundColor: col,
                            borderColor: editForm.color === col ? "#000" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>取消</Button>
                    <Button type="submit" size="sm" disabled={!editForm.name.trim()}>保存</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            {courses.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white"
                style={{ backgroundColor: c.color ?? "#6366F1" }}
              >
                <span>{c.name}</span>
                {c.location && <span className="opacity-75">· {c.location}</span>}
                <button onClick={() => startEdit(c)} className="opacity-60 hover:opacity-100 ml-0.5">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="opacity-60 hover:opacity-100 font-medium">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
