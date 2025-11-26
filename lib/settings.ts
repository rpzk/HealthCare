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
    try {
      // @ts-ignore - Proteção contra falta de migração/generate
      if (!prisma.systemSetting) return defaultValue

      const setting = await prisma.systemSetting.findUnique({
        where: { key }
      })
      return setting?.value ?? defaultValue
    } catch (error) {
      console.warn(`Failed to fetch setting ${key}:`, error)
      return defaultValue
    }
  },

  async set(key: string, value: string, category: SettingCategory = 'GENERAL', description?: string): Promise<void> {
    // @ts-ignore
    if (!prisma.systemSetting) throw new Error('Database not ready (SystemSetting model missing)')

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value, category, description },
      create: { key, value, category, description }
    })
  },

  async getMany(keys: string[]): Promise<Record<string, string>> {
    try {
      // @ts-ignore
      if (!prisma.systemSetting) return {}

      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: keys } }
      })
      
      const result: Record<string, string> = {}
      settings.forEach(s => {
        result[s.key] = s.value
      })
      return result
    } catch (error) {
      console.warn('Failed to fetch settings:', error)
      return {}
    }
  },

  async getAllByCategory(category: SettingCategory) {
    try {
      // @ts-ignore
      if (!prisma.systemSetting) return []

      return prisma.systemSetting.findMany({
        where: { category },
        orderBy: { key: 'asc' }
      })
    } catch (error) {
      console.warn('Failed to fetch settings by category:', error)
      return []
    }
  }
}
