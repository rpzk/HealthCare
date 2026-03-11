#!/usr/bin/env tsx
/**
 * Seed de templates de documentos a partir de fixtures
 * Uso: npm run db:seed:document-templates
 */

import 'dotenv/config'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { DocumentTemplateService } from '@/lib/document-templates/service'

interface TemplateFixture {
  key: string
  name: string
  documentType: string
  description?: string
  htmlTemplate: string
  cssTemplate?: string
  config?: object
  signaturePosition?: string
  signatureSize?: string
  qrcodePosition?: string
  qrcodeSize?: string
  showQrcode?: boolean
}

function loadFixtures(): TemplateFixture[] {
  const fixturePath = path.join(process.cwd(), 'fixtures', 'document-templates.json')
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture não encontrado: ${fixturePath}`)
  }
  const raw = fs.readFileSync(fixturePath, 'utf-8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('fixtures/document-templates.json está vazio ou inválido')
  }
  return data
}

async function main() {
  console.log('🌱 Seeding document templates from fixtures...')

  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    select: { id: true },
  })
  if (!admin) {
    throw new Error('Nenhum usuário ADMIN encontrado. Execute npm run db:seed primeiro.')
  }

  const templates = loadFixtures()

  for (const t of templates) {
    const existing = await prisma.documentTemplate.findFirst({
      where: {
        documentType: t.documentType,
        isDefault: true,
      },
    })
    if (existing) {
      console.log(`⏭️  ${t.name} (já existe como padrão)`)
      continue
    }

    try {
      await DocumentTemplateService.createTemplate(
        {
          name: t.name,
          documentType: t.documentType,
          description: t.description,
          htmlTemplate: t.htmlTemplate,
          cssTemplate: t.cssTemplate ?? '',
          config: t.config,
          signaturePosition: t.signaturePosition,
          signatureSize: t.signatureSize,
          qrcodePosition: t.qrcodePosition,
          qrcodeSize: t.qrcodeSize,
          showQrcode: t.showQrcode ?? true,
          isDefault: true,
          isActive: true,
        },
        admin.id
      )
      console.log(`✅ ${t.name}`)
    } catch (err) {
      console.error(`❌ ${t.name}:`, err)
    }
  }

  console.log(`\n✨ Document templates seed concluído.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
