import { getServerSession } from "next-auth"
import { authOptions } from "./lib/auth"

// Minimal wrapper to provide `auth()` compatible with our routes
export async function auth() {
  return getServerSession(authOptions as any)
}

export type { Session } from "next-auth"
