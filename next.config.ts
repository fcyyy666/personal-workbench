import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 允许从天天基金加载图片
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.eastmoney.com" },
    ],
  },
  // 安全响应头
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
