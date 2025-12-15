import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_SETTINGS = [
  // STORAGE
  {
    key: 'STORAGE_TYPE',
    value: 'local',
    category: 'STORAGE',
    encrypted: false,
    isPublic: false,
    description: 'Tipo de armazenamento: local, s3, ou minio',
  },
  {
    key: 'LOCAL_STORAGE_PATH',
    value: './uploads/recordings',
    category: 'STORAGE',
    encrypted: false,
    isPublic: false,
    description: 'Caminho local para armazenar gravações',
  },
  {
    key: 'STORAGE_BUCKET',
    value: 'healthcare-recordings',
    category: 'STORAGE',
    encrypted: false,
    isPublic: false,
    description: 'Nome do bucket S3/MinIO',
  },

  // REDIS
  {
    key: 'REDIS_HOST',
    value: 'localhost',
    category: 'REDIS',
    encrypted: false,
    isPublic: false,
    description: 'Host do servidor Redis',
  },
  {
    key: 'REDIS_PORT',
    value: '6379',
    category: 'REDIS',
    encrypted: false,
    isPublic: false,
    description: 'Porta do servidor Redis',
  },
  {
    key: 'REDIS_DB',
    value: '0',
    category: 'REDIS',
    encrypted: false,
    isPublic: false,
    description: 'Número do banco de dados Redis',
  },

  // WHATSAPP
  {
    key: 'WHATSAPP_PROVIDER',
    value: 'evolution',
    category: 'WHATSAPP',
    encrypted: false,
    isPublic: false,
    description: 'Provedor WhatsApp: evolution, twilio, zenvia',
  },

  // EMAIL
  {
    key: 'SMTP_HOST',
    value: 'smtp.gmail.com',
    category: 'EMAIL',
    encrypted: false,
    isPublic: false,
    description: 'Host do servidor SMTP',
  },
  {
    key: 'SMTP_PORT',
    value: '587',
    category: 'EMAIL',
    encrypted: false,
    isPublic: false,
    description: 'Porta do servidor SMTP',
  },
  {
    key: 'SMTP_SECURE',
    value: 'false',
    category: 'EMAIL',
    encrypted: false,
    isPublic: false,
    description: 'Usar SSL/TLS (true/false)',
  },
  {
    key: 'EMAIL_FROM',
    value: 'noreply@healthcare.com',
    category: 'EMAIL',
    encrypted: false,
    isPublic: false,
    description: 'Endereço de e-mail remetente',
  },
  {
    key: 'EMAIL_FROM_NAME',
    value: 'HealthCare System',
    category: 'EMAIL',
    encrypted: false,
    isPublic: false,
    description: 'Nome do remetente',
  },

  // WEBRTC
  {
    key: 'NEXT_PUBLIC_ICE_SERVERS',
    value: JSON.stringify([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]),
    category: 'WEBRTC',
    encrypted: false,
    isPublic: true,
    description: 'Servidores STUN/TURN para WebRTC',
  },

  // GENERAL
  {
    key: 'SYSTEM_NAME',
    value: 'HealthCare Medical Records',
    category: 'GENERAL',
    encrypted: false,
    isPublic: true,
    description: 'Nome do sistema',
  },
  {
    key: 'SUPPORT_EMAIL',
    value: 'support@healthcare.com',
    category: 'GENERAL',
    encrypted: false,
    isPublic: true,
    description: 'E-mail de suporte',
  },
  {
    key: 'MAX_FILE_SIZE_MB',
    value: '500',
    category: 'GENERAL',
    encrypted: false,
    isPublic: false,
    description: 'Tamanho máximo de arquivo em MB',
  },
  {
    key: 'SESSION_TIMEOUT_MINUTES',
    value: '30',
    category: 'GENERAL',
    encrypted: false,
    isPublic: false,
    description: 'Timeout de sessão em minutos',
  },
]

async function main() {
  console.log('🌱 Seeding system settings...')

  for (const setting of DEFAULT_SETTINGS) {
    const { description, ...data } = setting

    await prisma.systemSetting.upsert({
      where: { key: data.key },
      update: data,
      create: data,
    })

    console.log(`✅ ${data.key} (${data.category})`)
  }

  console.log(`\n✨ Seeded ${DEFAULT_SETTINGS.length} settings successfully!`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding settings:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
