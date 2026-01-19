import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      speciality?: string
      crmNumber?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    speciality?: string
    crmNumber?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    speciality?: string
    crmNumber?: string
  }
}
