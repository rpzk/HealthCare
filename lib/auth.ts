import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
// Lazy Prisma para evitar problemas de empacotamento/edge
let prismaRef: any | undefined
async function getPrisma() {
  if (!prismaRef) {
    const { PrismaClient } = await import('@prisma/client')
    prismaRef = new PrismaClient()
  }
  // Widen type to avoid TS narrowing issues with findFirst/select
  return prismaRef as any
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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('Tentativa de login sem credenciais completas')
          return null
        }

        try {
          // Extra: log de diagnóstico do DATABASE_URL (seguro, sem expor senha)
          // Only logged when DEBUG_AUTH=true, via logger.debug

          const ip = (req as any)?.headers?.get?.('x-forwarded-for') || (req as any)?.headers?.get?.('x-real-ip')
          const key = getLoginKey(credentials.email, ip)
          const attempt = loginAttempts.get(key) || { count: 0 }
          const now = Date.now()
          const bruteForceDisabled = (process.env.DISABLE_LOGIN_BRUTEFORCE || '') === '1'
          if (!bruteForceDisabled && attempt.blockedUntil && attempt.blockedUntil > now) {
            console.warn(`IP/email bloqueado temporariamente: ${credentials.email}`)
            return null
          }

          const prisma = await getPrisma()
          // Case-insensitive search to avoid email casing issues
          const user = await prisma.user.findFirst({
            where: {
              email: { equals: credentials.email, mode: 'insensitive' }
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true,
              isActive: true
            }
          })

          if (!user) {
            console.warn(`Tentativa de login com email não encontrado: ${credentials.email}`)
            return null
          }

          if (!user.isActive) {
            console.warn(`Tentativa de login com usuário inativo: ${credentials.email}`)
            return null
          }

          // Validar estritamente com hash (sem fallback inseguro)
          const isPasswordValid = user.password
            ? await bcrypt.compare(credentials.password, user.password)
            : false

          if (!isPasswordValid) {
            console.warn(`Senha incorreta para usuário: ${credentials.email}`)
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
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        } catch (error) {
          console.error('Erro na autenticação:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
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
