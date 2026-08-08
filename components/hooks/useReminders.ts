"use client"

import { useEffect } from "react"

interface Prefs {
  habitOn: boolean
  habitTime: string
  taskOn: boolean
  taskTime: string
}

function todayKey(type: string) {
  return `wb_fired_${type}_${new Date().toISOString().split("T")[0]}`
}

function timeMatches(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const now = new Date()
  return now.getHours() === h && now.getMinutes() === m
}

async function checkAndFire() {
  if (typeof window === "undefined" || typeof Notification === "undefined") return
  if (Notification.permission !== "granted") return

  let prefs: Prefs
  try {
    const raw = localStorage.getItem("wb_reminders")
    if (!raw) return
    prefs = JSON.parse(raw)
  } catch {
    return
  }

  if (prefs.habitOn && prefs.habitTime && timeMatches(prefs.habitTime) && !localStorage.getItem(todayKey("habit"))) {
    new Notification("习惯打卡提醒 ✅", { body: "别忘了今天的习惯打卡！" })
    localStorage.setItem(todayKey("habit"), "1")
  }

  if (prefs.taskOn && prefs.taskTime && timeMatches(prefs.taskTime) && !localStorage.getItem(todayKey("task"))) {
    try {
      const res = await fetch("/api/tasks")
      if (res.ok) {
        const tasks: { completed: boolean; dueDate: string | null }[] = await res.json()
        const today = new Date().toISOString().split("T")[0]
        const due = tasks.filter(t => !t.completed && t.dueDate?.startsWith(today))
        if (due.length > 0) {
          new Notification("任务截止提醒 📋", { body: `今天有 ${due.length} 个任务截止，记得完成！` })
          localStorage.setItem(todayKey("task"), "1")
        }
      }
    } catch {}
  }
}

export function useReminders() {
  useEffect(() => {
    checkAndFire()
    const interval = setInterval(checkAndFire, 60_000)
    window.addEventListener("focus", checkAndFire)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", checkAndFire)
    }
  }, [])
}
