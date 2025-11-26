import { prisma } from '@/lib/prisma'

export type SettingCategory = 'GENERAL' | 'EMAIL' | 'SECURITY' | 'SYSTEM'

export interface SystemSetting {
  key: string
  value: string
  description?: string
  category: SettingCategory
  isPublic: boolean
}

export const settings = {
  async get(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    })
    return setting?.value ?? defaultValue
  },

  async set(key: string, value: string, category: SettingCategory = 'GENERAL', description?: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value, category, description },
      create: { key, value, category, description }
    })
  },

  async getMany(keys: string[]): Promise<Record<string, string>> {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } }
    })
    
    const result: Record<string, string> = {}
    settings.forEach(s => {
      result[s.key] = s.value
    })
    return result
  },

  async getAllByCategory(category: SettingCategory) {
    return prisma.systemSetting.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    })
  }
}
