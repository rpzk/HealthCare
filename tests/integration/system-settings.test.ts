import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SystemSettingsService } from '@/lib/system-settings-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('SystemSettings Integration Tests', () => {
  beforeAll(async () => {
    // Limpar configurações de teste
    await prisma.systemSetting.deleteMany({
      where: { key: { startsWith: 'TEST_' } },
    })
  })

  afterAll(async () => {
    // Limpar após testes
    await prisma.systemSetting.deleteMany({
      where: { key: { startsWith: 'TEST_' } },
    })
    await prisma.$disconnect()
  })

  describe('Basic CRUD Operations', () => {
    it('should create and retrieve a setting', async () => {
      await SystemSettingsService.set('TEST_BASIC_KEY', 'test-value', {
        category: 'GENERAL',
      })

      const value = await SystemSettingsService.get('TEST_BASIC_KEY')
      expect(value).toBe('test-value')
    })

    it('should update existing setting', async () => {
      await SystemSettingsService.set('TEST_UPDATE_KEY', 'initial-value', {
        category: 'GENERAL',
      })

      await SystemSettingsService.set('TEST_UPDATE_KEY', 'updated-value', {
        category: 'GENERAL',
      })

      const value = await SystemSettingsService.get('TEST_UPDATE_KEY')
      expect(value).toBe('updated-value')
    })

    it('should list settings by category', async () => {
      await SystemSettingsService.set('TEST_CAT1', 'value1', {
        category: 'TEST_CATEGORY',
      })
      await SystemSettingsService.set('TEST_CAT2', 'value2', {
        category: 'TEST_CATEGORY',
      })

      const settings = await SystemSettingsService.list({
        category: 'TEST_CATEGORY',
      })

      expect(settings.length).toBeGreaterThanOrEqual(2)
      expect(settings.some((s) => s.key === 'TEST_CAT1')).toBe(true)
      expect(settings.some((s) => s.key === 'TEST_CAT2')).toBe(true)
    })
  })

  describe('Encryption', () => {
    it('should encrypt and decrypt sensitive values', async () => {
      const secretValue = 'super-secret-password-123'

      await SystemSettingsService.set('TEST_ENCRYPTED_KEY', secretValue, {
        category: 'GENERAL',
        encrypted: true,
      })

      // Verificar que está criptografado no banco
      const dbRecord = await prisma.systemSetting.findUnique({
        where: { key: 'TEST_ENCRYPTED_KEY' },
      })

      expect(dbRecord?.encrypted).toBe(true)
      expect(dbRecord?.value).not.toBe(secretValue)
      expect(dbRecord?.value).toContain(':') // IV:encrypted format

      // Verificar que descriptografa corretamente
      const retrievedValue = await SystemSettingsService.get('TEST_ENCRYPTED_KEY')
      expect(retrievedValue).toBe(secretValue)
    })

    it('should mask encrypted values when listing', async () => {
      await SystemSettingsService.set('TEST_SECRET', 'my-api-key', {
        category: 'GENERAL',
        encrypted: true,
      })

      const settings = await SystemSettingsService.list({
        publicOnly: false,
      })

      const secretSetting = settings.find((s) => s.key === 'TEST_SECRET')
      expect(secretSetting?.value).toBe('********')
    })
  })

  describe('Cache Behavior', () => {
    it('should cache values and respect TTL', async () => {
      await SystemSettingsService.set('TEST_CACHE_KEY', 'cached-value', {
        category: 'GENERAL',
      })

      // Primeira leitura (vai para cache)
      const value1 = await SystemSettingsService.get('TEST_CACHE_KEY')
      expect(value1).toBe('cached-value')

      // Atualizar diretamente no banco (bypass service)
      await prisma.systemSetting.update({
        where: { key: 'TEST_CACHE_KEY' },
        data: { value: 'updated-in-db' },
      })

      // Segunda leitura (ainda deve retornar cache)
      const value2 = await SystemSettingsService.get('TEST_CACHE_KEY')
      expect(value2).toBe('cached-value')

      // Limpar cache
      SystemSettingsService.clearCache('TEST_CACHE_KEY')

      // Terceira leitura (deve ler do banco)
      const value3 = await SystemSettingsService.get('TEST_CACHE_KEY')
      expect(value3).toBe('updated-in-db')
    })
  })

  describe('Fallback to .env', () => {
    it('should fallback to process.env when key not in DB', async () => {
      // Assumindo que NODE_ENV está definido
      const value = await SystemSettingsService.get('NODE_ENV', 'development')
      expect(value).toBeDefined()
      expect(['development', 'test', 'production']).toContain(value)
    })

    it('should prioritize DB over .env', async () => {
      // NODE_ENV está no .env como 'test'
      await SystemSettingsService.set('NODE_ENV', 'from-database', {
        category: 'GENERAL',
      })

      const value = await SystemSettingsService.get('NODE_ENV')
      expect(value).toBe('from-database')

      // Limpar
      await prisma.systemSetting.delete({ where: { key: 'NODE_ENV' } })
    })

    it('should use default value when not in DB or .env', async () => {
      const value = await SystemSettingsService.get(
        'NONEXISTENT_KEY_12345',
        'default-value'
      )
      expect(value).toBe('default-value')
    })
  })

  describe('Helper Methods', () => {
    it('should get storage config', async () => {
      await SystemSettingsService.set('STORAGE_TYPE', 'local', {
        category: 'STORAGE',
      })
      await SystemSettingsService.set('LOCAL_STORAGE_PATH', './test-uploads', {
        category: 'STORAGE',
      })

      const config = await SystemSettingsService.getStorageConfig()

      expect(config.type).toBe('local')
      expect(config.path).toBe('./test-uploads')
    })

    it('should get Redis config', async () => {
      await SystemSettingsService.set('REDIS_HOST', 'localhost', {
        category: 'REDIS',
      })
      await SystemSettingsService.set('REDIS_PORT', '6379', {
        category: 'REDIS',
      })

      const config = await SystemSettingsService.getRedisConfig()

      expect(config.host).toBe('localhost')
      expect(config.port).toBe(6379)
    })

    it('should get WhatsApp config', async () => {
      await SystemSettingsService.set('WHATSAPP_PROVIDER', 'evolution', {
        category: 'WHATSAPP',
      })
      await SystemSettingsService.set('WHATSAPP_API_URL', 'https://api.evolution.test', {
        category: 'WHATSAPP',
        encrypted: true,
      })

      const config = await SystemSettingsService.getWhatsAppConfig()

      expect(config.provider).toBe('evolution')
      expect(config.apiUrl).toBe('https://api.evolution.test')
    })
  })

  describe('Public vs Private Settings', () => {
    it('should respect publicOnly filter', async () => {
      await SystemSettingsService.set('TEST_PUBLIC', 'public-value', {
        category: 'GENERAL',
        isPublic: true,
      })
      await SystemSettingsService.set('TEST_PRIVATE', 'private-value', {
        category: 'GENERAL',
        isPublic: false,
      })

      const publicSettings = await SystemSettingsService.list({
        publicOnly: true,
      })

      const hasPublic = publicSettings.some((s) => s.key === 'TEST_PUBLIC')
      const hasPrivate = publicSettings.some((s) => s.key === 'TEST_PRIVATE')

      expect(hasPublic).toBe(true)
      expect(hasPrivate).toBe(false)
    })
  })
})
