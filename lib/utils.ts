import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

/** 获取今天的日期（本地时区）*/
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** 问候语 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "夜深了"
  if (hour < 12) return "早上好"
  if (hour < 14) return "中午好"
  if (hour < 18) return "下午好"
  return "晚上好"
}

/** 格式化体重变化 */
export function formatWeightChange(change: number): string {
  if (change === 0) return "持平"
  return change > 0 ? `↑ ${change.toFixed(1)} kg` : `↓ ${Math.abs(change).toFixed(1)} kg`
}
