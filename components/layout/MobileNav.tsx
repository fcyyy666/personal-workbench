"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, CheckSquare, Dumbbell, Scale, TrendingUp, BookOpen, Flag } from "lucide-react"

const mobileNavItems = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/tasks", label: "任务", icon: CheckSquare },
  { href: "/goals", label: "目标", icon: Flag },
  { href: "/fitness", label: "健身", icon: Dumbbell },
  { href: "/weight", label: "体重", icon: Scale },
  { href: "/funds", label: "基金", icon: TrendingUp },
  { href: "/courses", label: "课程", icon: BookOpen },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-sm">
      <div className="flex items-center justify-around h-14 px-1">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors min-w-0",
                active ? "text-zinc-900" : "text-zinc-400"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
