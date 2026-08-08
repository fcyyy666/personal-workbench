import { db } from "../lib/db"
import bcrypt from "bcryptjs"

async function main() {
  const password = await bcrypt.hash("changeme123", 10)
  const user = await db.user.upsert({
    where: { email: "me@personal.com" },
    update: {},
    create: { email: "me@personal.com", name: "我", password },
  })
  console.log("种子用户已创建:", user.email)
  console.log("默认密码: changeme123（请登录后在设置中修改）")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
