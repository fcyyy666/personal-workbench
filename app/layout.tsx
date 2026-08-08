import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/Providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "个人工作台",
  description: "我的日常生活管理中心",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "工作台",
  },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased bg-zinc-50 text-zinc-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
