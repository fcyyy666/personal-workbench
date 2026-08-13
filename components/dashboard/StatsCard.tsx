import Link from "next/link"
import { Card, CardHeader, CardTitle, CardValue, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  sub?: string
  icon: LucideIcon
  iconColor?: string
  trend?: "up" | "down" | "neutral"
  href?: string
}

export function StatsCard({ title, value, sub, icon: Icon, iconColor = "text-zinc-400", trend, href }: StatsCardProps) {
  const card = (
    <Card className={cn("h-full flex flex-col", href && "cursor-pointer hover:shadow-md transition-shadow")}>
      <CardHeader className="flex-1">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <CardValue>{value}</CardValue>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={cn(
          "text-xs",
          trend === "up" && "text-red-500",
          trend === "down" && "text-green-600",
          trend === "neutral" && "text-zinc-400",
          !trend && "text-zinc-400"
        )}>
          {sub || "\u00A0"}
        </p>
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href} className="block h-full">{card}</Link>
  return card
}
