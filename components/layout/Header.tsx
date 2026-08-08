"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { getGreeting } from "@/lib/utils"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { LogOut, Settings } from "lucide-react"

export function Header() {
  const { data: session } = useSession()
  const now = new Date()
  const greeting = getGreeting()
  const dateStr = format(now, "M月d日 EEEE", { locale: zhCN })
  const name = session?.user?.name ?? "我"
  const image = session?.user?.image

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-zinc-100 bg-white">
      <div>
        <span className="text-sm font-medium text-zinc-900">{greeting}，</span>
        <span className="text-sm text-zinc-400">{dateStr}</span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="lg:hidden h-8 w-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
          title="设置"
        >
          <Settings className="h-4 w-4 text-zinc-400" />
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="h-8 px-2.5 rounded-lg hover:bg-zinc-100 flex items-center gap-1.5 transition-colors"
          title="退出登录"
        >
          <LogOut className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-500 hidden sm:inline">退出</span>
        </button>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="h-8 w-8 rounded-full object-cover border border-zinc-200" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
            <span className="text-xs text-white font-medium">{name.charAt(0)}</span>
          </div>
        )}
      </div>
    </header>
  )
}
