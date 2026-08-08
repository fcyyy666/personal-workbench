"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CheckSquare,
  Dumbbell,
  Scale,
  TrendingUp,
  BookOpen,
  Flag,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

const navItems = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/tasks", label: "任务", icon: CheckSquare },
  { href: "/goals", label: "目标", icon: Flag },
  { href: "/fitness", label: "健身", icon: Dumbbell },
  { href: "/weight", label: "体重", icon: Scale },
  { href: "/funds", label: "基金", icon: TrendingUp },
  { href: "/courses", label: "课程", icon: BookOpen },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn(
      "hidden lg:flex flex-col min-h-screen border-r border-zinc-200 bg-white transition-all duration-200",
      collapsed ? "w-14" : "w-56"
    )}>
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-100">
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-900 tracking-tight truncate">个人工作台</span>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />
          }
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md py-2 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-zinc-100 text-zinc-900 font-medium"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-zinc-100">
        <Link
          href="/settings"
          title={collapsed ? "设置" : undefined}
          className={cn(
            "flex items-center rounded-md py-2 text-sm transition-colors",
            collapsed ? "justify-center px-2" : "gap-3 px-3",
            pathname === "/settings"
              ? "bg-zinc-100 text-zinc-900 font-medium"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>设置</span>}
        </Link>
      </div>
    </aside>
  )
}
