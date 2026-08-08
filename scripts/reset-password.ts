import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function resetPassword() {
  const user = await db.user.findFirst()
  if (!user) {
    console.error('❌ 没有找到用户')
    await db.$disconnect()
    return
  }

  console.log('找到用户:', user.email, user.name)

  const newPassword = 'test1234'
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await db.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  console.log('✅ 密码已重置')
  console.log('邮箱:', user.email)
  console.log('新密码:', newPassword)

  await db.$disconnect()
}

resetPassword()
