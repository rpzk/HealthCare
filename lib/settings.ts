import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export type SettingCategory = 'GENERAL' | 'EMAIL' | 'SECURITY' | 'SYSTEM'

export interface SystemSetting {
  key: string
  value: string
  description?: string
  category: SettingCategory
  isPublic: boolean
}

interface SettingEntry {
  value: string
  category: string
  description?: string
  updatedAt?: string
}

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json')

// Helper para gerenciar arquivo de fallback
const fallbackManager = {
  ensureDirectory() {
    const dir = path.dirname(FALLBACK_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  },
  
  read(): Record<string, SettingEntry> {
    try {
      if (!fs.existsSync(FALLBACK_FILE_PATH)) return {}
      return JSON.parse(fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8'))
    } catch (e) {
      console.warn('Failed to read fallback settings file:', e)
      return {}
    }
  },

  write(data: Record<string, SettingEntry>) {
    try {
      this.ensureDirectory()
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('Failed to write fallback settings file:', e)
    }
  },

  get(key: string): string | null {
    const data = this.read()
    return data[key]?.value || null
  },

  set(key: string, value: string, category: string, description?: string) {
    const data = this.read()
    data[key] = { value, category, description, updatedAt: new Date().toISOString() }
    this.write(data)
  },

  getAllByCategory(category: string) {
    const data = this.read()
    return Object.entries(data)
      .filter(([_, val]: [string, SettingEntry]) => val.category === category)
      .map(([key, val]: [string, SettingEntry]) => ({
        key,
        value: val.value,
        category: val.category,
        description: val.description
      }))
  }
}

export const settings = {
  async get(key: string, defaultValue: string = ''): Promise<string> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key }
      })
      if (setting) {
        return setting.value
      }
      // Se não encontrou no banco, tenta fallback
      const fallback = fallbackManager.get(key)
      return fallback ?? defaultValue
    } catch (error) {
      console.warn(`[settings] Failed to fetch setting ${key} from DB, trying fallback...`, error)
      const fallback = fallbackManager.get(key)
      return fallback ?? defaultValue
    }
  },

  async set(key: string, value: string, category: SettingCategory = 'GENERAL', description?: string): Promise<void> {
    // Sempre salva no fallback primeiro (garantia)
    fallbackManager.set(key, value, category, description)
    
    try {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value, category, description },
        create: { key, value, category, description: description || null, isPublic: false }
      })
    } catch (error) {
      console.error(`[settings] Database error saving ${key}, fallback was used:`, error)
    }
  },

  async getMany(keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    
    try {
      const dbSettings = await prisma.systemSetting.findMany({
        where: { key: { in: keys } }
      })
      
      dbSettings.forEach(s => {
        result[s.key] = s.value
      })
      
      // Se faltou alguma chave no banco, tenta pegar do fallback
      keys.forEach(key => {
        if (!result[key]) {
          const val = fallbackManager.get(key)
          if (val !== null) result[key] = val
        }
      })

      return result
    } catch (error) {
      console.warn('[settings] Failed to fetch settings from DB, trying fallback...', error)
      keys.forEach(key => {
        const val = fallbackManager.get(key)
        if (val !== null) result[key] = val
      })
      return result
    }
  },

  async getAllByCategory(category: SettingCategory) {
    let dbSettings: { key: string; value: string; category: string; description?: string | null }[] = []
    try {
      dbSettings = await prisma.systemSetting.findMany({
        where: { category },
        orderBy: { key: 'asc' }
      })
    } catch (error) {
      console.warn('[settings] Failed to fetch settings by category from DB', error)
    }

    const fileSettings = fallbackManager.getAllByCategory(category)
    
    // Merge: DB wins if key exists, otherwise File
    const merged: { key: string; value: string; category: string; description?: string | null }[] = [...fileSettings]
    
    dbSettings.forEach(dbItem => {
      const index = merged.findIndex(m => m.key === dbItem.key)
      if (index >= 0) {
        merged[index] = { key: dbItem.key, value: dbItem.value, category: dbItem.category, description: dbItem.description }
      } else {
        merged.push({ key: dbItem.key, value: dbItem.value, category: dbItem.category, description: dbItem.description })
      }
    })
    
    return merged
  }
}
