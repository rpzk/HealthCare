import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-change-in-production'
const ALGORITHM = 'aes-256-gcm'

/**
 * Criptografa dados sensíveis (secret do TOTP, backup codes)
 */
function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Descriptografa dados sensíveis
 */
function decrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const parts = text.split(':')
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }
  
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Gera backup codes para 2FA
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Gerar código de 8 dígitos
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * Configura 2FA para um usuário
 */
export async function setupTwoFactor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, twoFactorEnabled: true }
  })
  
  if (!user) {
    throw new Error('Usuário não encontrado')
  }
  
  if (user.twoFactorEnabled) {
    throw new Error('2FA já está habilitado para este usuário')
  }
  
  // Gerar secret do TOTP
  const secret = speakeasy.generateSecret({
    name: `HealthCare (${user.email})`,
    issuer: 'HealthCare System',
    length: 32
  })
  
  // Gerar backup codes
  const backupCodes = generateBackupCodes()
  
  // Criptografar secret e backup codes
  const encryptedSecret = encrypt(secret.base32)
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes))
  
  // Gerar QR Code
  const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url!)
  
  // Salvar no banco (mas NÃO habilitar ainda - apenas após verificação)
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: encryptedSecret,
      twoFactorBackupCodes: encryptedBackupCodes,
      // twoFactorEnabled permanece false até verificação
    }
  })
  
  return {
    secret: secret.base32, // Retornar apenas para exibir ao usuário uma vez
    qrCode: qrCodeDataURL,
    backupCodes: backupCodes
  }
}

/**
 * Verifica código TOTP e habilita 2FA
 */
export async function verifyAndEnableTwoFactor(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      twoFactorSecret: true, 
      twoFactorEnabled: true 
    }
  })
  
  if (!user || !user.twoFactorSecret) {
    throw new Error('2FA não foi configurado para este usuário')
  }
  
  if (user.twoFactorEnabled) {
    throw new Error('2FA já está habilitado')
  }
  
  // Descriptografar secret
  const secret = decrypt(user.twoFactorSecret)
  
  // Verificar token TOTP
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Permite ±2 intervalos de tempo (60s cada)
  })
  
  if (!verified) {
    return false
  }
  
  // Habilitar 2FA após verificação bem-sucedida
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorEnabledAt: new Date()
    }
  })
  
  return true
}

/**
 * Verifica código TOTP durante o login
 */
export async function verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorBackupCodes: true
    }
  })
  
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return false
  }
  
  // Verificar se é um backup code
  if (user.twoFactorBackupCodes) {
    try {
      const backupCodes = JSON.parse(decrypt(user.twoFactorBackupCodes)) as string[]
      const normalizedToken = token.replace(/\s|-/g, '').toUpperCase()
      
      if (backupCodes.includes(normalizedToken)) {
        // Remover código usado
        const updatedCodes = backupCodes.filter(code => code !== normalizedToken)
        
        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorBackupCodes: encrypt(JSON.stringify(updatedCodes))
          }
        })
        
        return true
      }
    } catch (error) {
      // Ignorar erro de parsing, continuar para verificar TOTP
    }
  }
  
  // Verificar código TOTP
  const secret = decrypt(user.twoFactorSecret)
  
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  })
}

/**
 * Desabilita 2FA para um usuário
 */
export async function disableTwoFactor(userId: string, password: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, twoFactorEnabled: true }
  })
  
  if (!user || !user.twoFactorEnabled) {
    throw new Error('2FA não está habilitado')
  }
  
  // Verificar senha antes de desabilitar
  if (!user.password) {
    throw new Error('Usuário não possui senha configurada')
  }
  
  const validPassword = await bcrypt.compare(password, user.password)
  
  if (!validPassword) {
    throw new Error('Senha incorreta')
  }
  
  // Desabilitar e limpar dados de 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      twoFactorEnabledAt: null
    }
  })
  
  return true
}

/**
 * Gera novos backup codes (invalidando os antigos)
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true }
  })
  
  if (!user || !user.twoFactorEnabled) {
    throw new Error('2FA não está habilitado')
  }
  
  const backupCodes = generateBackupCodes()
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorBackupCodes: encrypt(JSON.stringify(backupCodes))
    }
  })
  
  return backupCodes
}
