import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { verifyAuthenticationResponseForUser } from './webauthn'

async function getPrisma() {
  const { prisma } = await import('@/lib/prisma')
  return prisma
}
import bcrypt from "bcryptjs"
import { logger } from '@/lib/logger'
const DEBUG_AUTH = (process.env.DEBUG_AUTH || '') === '1'

// Mitigação simples de brute-force (dev). Em produção, usar Redis/ip-based limiter
const loginAttempts = new Map<string, { count: number; blockedUntil?: number }>()
const MAX_ATTEMPTS = 5
const BLOCK_MS = 10 * 60 * 1000 // 10 min

function getLoginKey(email: string, ip?: string) {
  return `${(email || '').toLowerCase()}|${ip || 'unknown'}`
}

function normalizeEmail(email: string) {
  return (email || '').trim()
}

function normalizeBcryptHash(hash: string) {
  // Compat: some systems store bcrypt hashes with $2y$ prefix (PHP).
  // Node bcrypt/bcryptjs typically expects $2a$/$2b$.
  return hash.startsWith('$2y$') ? `$2b$${hash.slice(4)}` : hash
}

// Função auxiliar para registrar auditoria de autenticação (LGPD)
async function logAuthEvent(params: {
  userId?: string
  userEmail: string
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSKEY_LOGIN_SUCCESS' | 'PASSKEY_LOGIN_FAILED'
  success: boolean
  ipAddress?: string
  userAgent?: string
  errorMessage?: string
  metadata?: Record<string, string | number | boolean>
}) {
  try {
    const prisma = await getPrisma()
    await prisma.auditLog.create({
      data: {
        userId: params.userId || 'anonymous',
        userEmail: params.userEmail,
        userRole: 'AUTH',
        action: params.action,
        resourceType: 'Authentication',
        success: params.success,
        ipAddress: params.ipAddress || 'unknown',
        userAgent: params.userAgent || 'unknown',
        errorMessage: params.errorMessage,
        metadata: params.metadata as any
      }
    })
    logger.info({ action: params.action, email: params.userEmail, success: params.success }, 'Evento de autenticação registrado')
  } catch (error) {
    // Não falhar login por erro de auditoria
    logger.error({ error }, 'Erro ao registrar auditoria de autenticação')
  }
}

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
      id: "passkey",
      name: "Passkey",
      credentials: {
        email: { label: "Email", type: "email" },
        assertion: { label: "Assertion", type: "text" }
      },
      async authorize(credentials, req) {
        const ipAddress = (req as any)?.headers?.get?.('x-forwarded-for') || (req as any)?.headers?.get?.('x-real-ip') || 'unknown'
        const userAgent = (req as any)?.headers?.get?.('user-agent') || 'unknown'
        
        if (!credentials?.email || !credentials?.assertion) {
          logger.warn('Tentativa de login passkey sem email/assertion')
          await logAuthEvent({
            userEmail: credentials?.email || 'unknown',
            action: 'PASSKEY_LOGIN_FAILED',
            success: false,
            ipAddress,
            userAgent,
            errorMessage: 'Credenciais incompletas'
          })
          return null
        }

        try {
          const prisma = await getPrisma()
          const user = await prisma.user.findFirst({
            where: { email: { equals: credentials.email, mode: 'insensitive' } },
            select: { id: true, email: true, name: true, role: true, isActive: true }
          })

          if (!user || !user.isActive) {
            logger.warn('Usuário inválido/inativo para passkey', credentials.email)
            await logAuthEvent({
              userEmail: credentials.email,
              action: 'PASSKEY_LOGIN_FAILED',
              success: false,
              ipAddress,
              userAgent,
              errorMessage: user ? 'Usuário inativo' : 'Usuário não encontrado'
            })
            return null
          }

          const assertion = JSON.parse(credentials.assertion)
          const verification = await verifyAuthenticationResponseForUser(credentials.email, assertion, req as any)
          if (!verification.verified) {
            logger.warn('Passkey não verificada para', credentials.email)
            await logAuthEvent({
              userId: user.id,
              userEmail: credentials.email,
              action: 'PASSKEY_LOGIN_FAILED',
              success: false,
              ipAddress,
              userAgent,
              errorMessage: 'Verificação de passkey falhou'
            })
            return null
          }

          // Login bem-sucedido com passkey
          await logAuthEvent({
            userId: user.id,
            userEmail: user.email,
            action: 'PASSKEY_LOGIN_SUCCESS',
            success: true,
            ipAddress,
            userAgent,
            metadata: { method: 'passkey' }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          logger.error('Erro na autenticação passkey:', error)
          await logAuthEvent({
            userEmail: credentials.email,
            action: 'PASSKEY_LOGIN_FAILED',
            success: false,
            ipAddress,
            userAgent,
            errorMessage: 'Erro interno'
          })
          return null
        }
      }
    }),
  CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email || '')
        const password = credentials?.password || ''
        
        // Extrair IP e User-Agent para auditoria
        const ipAddress = (req as any)?.headers?.get?.('x-forwarded-for') || (req as any)?.headers?.get?.('x-real-ip') || 'unknown'
        const userAgent = (req as any)?.headers?.get?.('user-agent') || 'unknown'

        if (!email || !password) {
          logger.warn('Tentativa de login sem credenciais completas')
          await logAuthEvent({
            userEmail: email || 'unknown',
            action: 'LOGIN_FAILED',
            success: false,
            ipAddress,
            userAgent,
            errorMessage: 'Credenciais incompletas'
          })
          return null
        }

        try {
          // Extra: log de diagnóstico do DATABASE_URL (seguro, sem expor senha)
          // Only logged when DEBUG_AUTH=true, via logger.debug

          const key = getLoginKey(email, ipAddress)
          const attempt = loginAttempts.get(key) || { count: 0 }
          const now = Date.now()
          const bruteForceDisabled = (process.env.DISABLE_LOGIN_BRUTEFORCE || '') === '1'
          if (!bruteForceDisabled && attempt.blockedUntil && attempt.blockedUntil > now) {
            logger.warn(`IP/email bloqueado temporariamente: ${email}`)
            await logAuthEvent({
              userEmail: email,
              action: 'LOGIN_FAILED',
              success: false,
              ipAddress,
              userAgent,
              errorMessage: 'IP/email bloqueado por tentativas excessivas'
            })
            return null
          }

          const prisma = await getPrisma()
          // Case-insensitive search to avoid email casing issues.
          // NOTE: DB unique constraint is case-sensitive in Postgres by default, so it's possible
          // to have duplicates differing only by casing; in that case, try all candidates.
          const candidates = await prisma.user.findMany({
            where: {
              email: { equals: email, mode: 'insensitive' }
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true,
              isActive: true
            },
            take: 5
          })

          if (candidates.length === 0) {
            logger.warn(`Tentativa de login com email não encontrado: ${email}`)
            await logAuthEvent({
              userEmail: email,
              action: 'LOGIN_FAILED',
              success: false,
              ipAddress,
              userAgent,
              errorMessage: 'Email não encontrado'
            })
            return null
          }

          const activeCandidates = candidates.filter(u => u.isActive)
          if (activeCandidates.length === 0) {
            logger.warn(`Tentativa de login com usuário(s) inativo(s): ${email}`)
            await logAuthEvent({
              userEmail: email,
              action: 'LOGIN_FAILED',
              success: false,
              ipAddress,
              userAgent,
              errorMessage: 'Usuário inativo'
            })
            return null
          }

          // Validar estritamente com hash (sem fallback inseguro)
          let matchedUser: (typeof activeCandidates)[number] | null = null
          for (const candidate of activeCandidates) {
            if (!candidate.password) continue
            const hash = normalizeBcryptHash(candidate.password)
            // eslint-disable-next-line no-await-in-loop
            const ok = await bcrypt.compare(password, hash)
            if (ok) {
              matchedUser = candidate
              break
            }
          }

          if (!matchedUser) {
            logger.warn(`Senha incorreta para usuário: ${email}`)
            // incrementar tentativas
            if (!bruteForceDisabled) {
              attempt.count += 1
              if (attempt.count >= MAX_ATTEMPTS) {
                attempt.blockedUntil = now + BLOCK_MS
              }
              loginAttempts.set(key, attempt)
            }
            await logAuthEvent({
              userEmail: email,
              action: 'LOGIN_FAILED',
              success: false,
              ipAddress,
              userAgent,
              errorMessage: 'Senha incorreta',
              metadata: { attemptCount: attempt.count }
            })
            return null
          }

          // reset em sucesso
          loginAttempts.delete(key)
          
          // Registrar login bem-sucedido (LGPD)
          await logAuthEvent({
            userId: matchedUser.id,
            userEmail: matchedUser.email,
            action: 'LOGIN_SUCCESS',
            success: true,
            ipAddress,
            userAgent,
            metadata: { method: 'credentials', role: matchedUser.role }
          })
          
          return {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role
          }
        } catch (error) {
          logger.error('Erro na autenticação:', error)
          await logAuthEvent({
            userEmail: email,
            action: 'LOGIN_FAILED',
            success: false,
            ipAddress,
            userAgent,
            errorMessage: 'Erro interno'
          })
          return null
        }
      }
    })
]

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      
      // Buscar papéis atribuídos (UserAssignedRole) se existir
      if (token.id && (trigger === 'signIn' || trigger === 'update')) {
        try {
          const prisma = await getPrisma()
          const assignedRoles = await prisma.userAssignedRole.findMany({
            where: { userId: token.id as string },
            select: { role: true, isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }]
          })
          
          if (assignedRoles.length > 0) {
            token.availableRoles = assignedRoles.map(r => r.role)
            const primary = assignedRoles.find(r => r.isPrimary)
            if (primary) {
              token.role = primary.role
            }
          } else {
            token.availableRoles = [token.role as string]
          }
        } catch (error) {
          // Se houver erro, apenas usar o role do User (sem falhar)
          token.availableRoles = [token.role as string]
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        if (token.availableRoles) {
          (session.user as any).availableRoles = token.availableRoles
        }
      }
      return session
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 horas
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error"
  },
  secret: process.env.NEXTAUTH_SECRET,
}
