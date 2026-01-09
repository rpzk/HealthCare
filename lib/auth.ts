import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { PrismaClient } from '@prisma/client'
import { verifyAuthenticationResponseForUser } from './webauthn'

// Lazy Prisma para evitar problemas de empacotamento/edge
let prismaRef: PrismaClient | undefined
async function getPrisma(): Promise<PrismaClient> {
  if (!prismaRef) {
    const { PrismaClient } = await import('@prisma/client')
    prismaRef = new PrismaClient()
  }
  return prismaRef
}
import bcrypt from "bcryptjs"
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

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
      id: "passkey",
      name: "Passkey",
      credentials: {
        email: { label: "Email", type: "email" },
        assertion: { label: "Assertion", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.assertion) {
          console.warn('Tentativa de login passkey sem email/assertion')
          return null
        }

        try {
          const prisma = await getPrisma()
          const user = await prisma.user.findFirst({
            where: { email: { equals: credentials.email, mode: 'insensitive' } },
            select: { id: true, email: true, name: true, role: true, isActive: true }
          })

          if (!user || !user.isActive) {
            console.warn('Usuário inválido/inativo para passkey', credentials.email)
            return null
          }

          const assertion = JSON.parse(credentials.assertion)
          const verification = await verifyAuthenticationResponseForUser(credentials.email, assertion, req as any)
          if (!verification.verified) {
            console.warn('Passkey não verificada para', credentials.email)
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Erro na autenticação passkey:', error)
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

        if (!email || !password) {
          console.warn('Tentativa de login sem credenciais completas')
          return null
        }

        try {
          // Extra: log de diagnóstico do DATABASE_URL (seguro, sem expor senha)
          // Only logged when DEBUG_AUTH=true, via logger.debug

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ipRaw = (req as { headers?: { get?: (name: string) => string | null } })?.headers?.get?.('x-forwarded-for') || (req as { headers?: { get?: (name: string) => string | null } })?.headers?.get?.('x-real-ip')
          const ip = ipRaw ?? undefined
          const key = getLoginKey(email, ip)
          const attempt = loginAttempts.get(key) || { count: 0 }
          const now = Date.now()
          const bruteForceDisabled = (process.env.DISABLE_LOGIN_BRUTEFORCE || '') === '1'
          if (!bruteForceDisabled && attempt.blockedUntil && attempt.blockedUntil > now) {
            console.warn(`IP/email bloqueado temporariamente: ${email}`)
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
            console.warn(`Tentativa de login com email não encontrado: ${email}`)
            return null
          }

          const activeCandidates = candidates.filter(u => u.isActive)
          if (activeCandidates.length === 0) {
            console.warn(`Tentativa de login com usuário(s) inativo(s): ${email}`)
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
            console.warn(`Senha incorreta para usuário: ${email}`)
            // incrementar tentativas
            if (!bruteForceDisabled) {
              attempt.count += 1
              if (attempt.count >= MAX_ATTEMPTS) {
                attempt.blockedUntil = now + BLOCK_MS
              }
              loginAttempts.set(key, attempt)
            }
            return null
          }

          // reset em sucesso
          loginAttempts.delete(key)
          return {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role
          }
        } catch (error) {
          console.error('Erro na autenticação:', error)
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
