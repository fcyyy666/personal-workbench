"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { User, Database, Bell, Download, Trash2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const CLEAR_MODULES = [
  { value: "tasks", label: "待办任务" },
  { value: "habits", label: "习惯打卡" },
  { value: "weight", label: "体重记录" },
  { value: "fitness", label: "运动健身" },
  { value: "funds", label: "基金持仓" },
  { value: "goals", label: "目标规划" },
  { value: "courses", label: "课程安排" },
]

export default function SettingsPage() {
  const { data: session, update } = useSession()

  const [nameOpen, setNameOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")

  const [exporting, setExporting] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearModule, setClearModule] = useState("tasks")
  const [clearConfirm, setClearConfirm] = useState("")
  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState("")

  const [habitReminderOn, setHabitReminderOn] = useState(false)
  const [habitTime, setHabitTime] = useState("09:00")
  const [taskReminderOn, setTaskReminderOn] = useState(false)
  const [taskTime, setTaskTime] = useState("09:00")
  const [notifMsg, setNotifMsg] = useState("")
  const [permStatus, setPermStatus] = useState<NotificationPermission | "unsupported">("default")

  useEffect(() => {
    if (session?.user) {
      setNameInput(session.user.name ?? "")
      setImagePreview(session.user.image ?? "")
    }
  }, [session])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wb_reminders")
      if (raw) {
        const p = JSON.parse(raw)
        setHabitReminderOn(!!p.habitOn)
        setHabitTime(p.habitTime ?? "09:00")
        setTaskReminderOn(!!p.taskOn)
        setTaskTime(p.taskTime ?? "09:00")
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof Notification === "undefined") setPermStatus("unsupported")
    else setPermStatus(Notification.permission)
  }, [])

  function flash(setter: (v: string) => void, msg: string) {
    setter(msg)
    setTimeout(() => setter(""), 3000)
  }

  async function requestPermission() {
    if (typeof Notification === "undefined") return
    const result = await Notification.requestPermission()
    setPermStatus(result)
  }

  function sendTestNotif() {
    new Notification("测试通知 🔔", { body: "提醒功能正常，将按你设置的时间发送提醒。" })
  }

  async function saveName() {
    if (!nameInput.trim()) return
    setProfileSaving(true)
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput }),
    })
    if (res.ok) {
      await update({ name: nameInput })
      setNameOpen(false)
      flash(setProfileMsg, "昵称已更新")
    }
    setProfileSaving(false)
  }

  async function saveImage() {
    if (!imageFile) return
    setProfileSaving(true)
    const form = new FormData()
    form.append("file", imageFile)
    const res = await fetch("/api/settings/upload", { method: "POST", body: form })
    if (res.ok) {
      const { url } = await res.json()
      await update({ image: url })
      setImageOpen(false)
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview("")
      flash(setProfileMsg, "头像已更新")
    }
    setProfileSaving(false)
  }

  async function exportData() {
    setExporting(true)
    const res = await fetch("/api/settings/export")
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `workbench-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  async function clearData() {
    if (clearConfirm !== "确认清空") return
    setClearing(true)
    const res = await fetch(`/api/settings/clear?module=${clearModule}`, { method: "DELETE" })
    if (res.ok) {
      setClearOpen(false)
      setClearConfirm("")
      flash(setClearMsg, `已清空 ${CLEAR_MODULES.find(m => m.value === clearModule)?.label}`)
    }
    setClearing(false)
  }

  function saveNotifications() {
    localStorage.setItem("wb_reminders", JSON.stringify({
      habitOn: habitReminderOn,
      habitTime,
      taskOn: taskReminderOn,
      taskTime,
    }))
    if ((habitReminderOn || taskReminderOn) && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission()
    }
    flash(setNotifMsg, "偏好已保存")
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">设置</h1>
        <p className="text-sm text-zinc-400 mt-0.5">管理你的工作台配置</p>
      </div>

      {/* 个人信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-zinc-400" />
              <CardTitle className="text-zinc-700">个人信息</CardTitle>
            </div>
            {profileMsg && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check className="h-3 w-3" />{profileMsg}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          <Separator className="mb-3" />
          <div>
            <button
              onClick={() => { setNameOpen(!nameOpen); setImageOpen(false) }}
              className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors text-left group"
            >
              <span className="text-sm text-zinc-700">修改昵称</span>
              <span className="text-xs text-zinc-400">
                {session?.user?.name ?? "未设置"} <span className="text-zinc-300 group-hover:text-zinc-500">→</span>
              </span>
            </button>
            {nameOpen && (
              <div className="px-2 pb-2 space-y-2 mt-1">
                <Input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="输入新昵称"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && saveName()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveName} disabled={profileSaving || !nameInput.trim()}>保存</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNameOpen(false)}>取消</Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => { setImageOpen(!imageOpen); setNameOpen(false) }}
              className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors text-left group"
            >
              <span className="text-sm text-zinc-700">修改头像</span>
              <span className="text-xs text-zinc-300 group-hover:text-zinc-500 transition-colors">→</span>
            </button>
            {imageOpen && (
              <div className="px-2 pb-2 space-y-2 mt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setImageFile(f)
                    if (imagePreview) URL.revokeObjectURL(imagePreview)
                    setImagePreview(URL.createObjectURL(f))
                  }}
                  className="text-sm text-zinc-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
                />
                {imagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="预览" className="h-12 w-12 rounded-full object-cover border border-zinc-200" />
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveImage} disabled={profileSaving || !imageFile}>保存</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setImageOpen(false); setImageFile(null); setImagePreview("") }}>取消</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-zinc-400" />
              <CardTitle className="text-zinc-700">数据管理</CardTitle>
            </div>
            {clearMsg && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check className="h-3 w-3" />{clearMsg}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          <Separator className="mb-3" />
          <button
            onClick={exportData}
            disabled={exporting}
            className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors text-left group disabled:opacity-50"
          >
            <span className="text-sm text-zinc-700">导出所有数据（JSON）</span>
            <Download className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
          </button>
          <div>
            <button
              onClick={() => { setClearOpen(!clearOpen); setClearConfirm("") }}
              className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors text-left group"
            >
              <span className="text-sm text-zinc-700">清空指定模块数据</span>
              <Trash2 className="h-4 w-4 text-zinc-300 group-hover:text-red-400 transition-colors" />
            </button>
            {clearOpen && (
              <div className="px-2 pb-2 space-y-3 mt-1">
                <div className="flex flex-wrap gap-2">
                  {CLEAR_MODULES.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setClearModule(m.value)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors",
                        clearModule === m.value
                          ? "border-red-300 bg-red-50 text-red-600"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-400">
                  输入 <span className="font-mono font-medium text-zinc-600">确认清空</span> 以继续
                </p>
                <Input
                  value={clearConfirm}
                  onChange={e => setClearConfirm(e.target.value)}
                  placeholder="确认清空"
                  className="font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={clearData}
                    disabled={clearConfirm !== "确认清空" || clearing}
                  >
                    清空数据
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setClearOpen(false)}>取消</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 通知提醒 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-zinc-400" />
              <CardTitle className="text-zinc-700">通知提醒</CardTitle>
            </div>
            {notifMsg && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check className="h-3 w-3" />{notifMsg}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <Separator className="mb-1" />
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-sm text-zinc-700">习惯提醒时间</p>
              <p className="text-xs text-zinc-400 mt-0.5">每天提醒你打卡</p>
            </div>
            <div className="flex items-center gap-3">
              {habitReminderOn && (
                <input
                  type="time"
                  value={habitTime}
                  onChange={e => setHabitTime(e.target.value)}
                  className="text-sm border border-zinc-200 rounded-md px-2 py-1 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                />
              )}
              <Toggle value={habitReminderOn} onChange={setHabitReminderOn} />
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-sm text-zinc-700">任务截止提醒</p>
              <p className="text-xs text-zinc-400 mt-0.5">任务到期当天提醒</p>
            </div>
            <div className="flex items-center gap-3">
              {taskReminderOn && (
                <input
                  type="time"
                  value={taskTime}
                  onChange={e => setTaskTime(e.target.value)}
                  className="text-sm border border-zinc-200 rounded-md px-2 py-1 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                />
              )}
              <Toggle value={taskReminderOn} onChange={setTaskReminderOn} />
            </div>
          </div>
          <div className="px-2 space-y-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-zinc-700">通知权限</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {permStatus === "granted" ? "已授权，提醒功能正常" :
                   permStatus === "denied" ? "已拒绝，请在浏览器设置中手动开启" :
                   permStatus === "unsupported" ? "当前浏览器不支持" : "未授权"}
                </p>
              </div>
              {permStatus === "default" && (
                <Button size="sm" variant="outline" onClick={requestPermission}>授权通知</Button>
              )}
              {permStatus === "granted" && (
                <Button size="sm" variant="outline" onClick={sendTestNotif}>发送测试</Button>
              )}
            </div>
            <Button size="sm" onClick={saveNotifications}>保存提醒设置</Button>
          </div>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>个人工作台 v0.1.0</span>
            <span>Phase 1 框架版</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        value ? "bg-zinc-900" : "bg-zinc-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
          value ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}
