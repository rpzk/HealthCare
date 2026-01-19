import { getServerSession, type Session } from "next-auth"
import { authOptions } from "./lib/auth"

// Export authOptions for API routes
export { authOptions }

// Minimal wrapper to provide `auth()` compatible with our routes
export async function auth(): Promise<Session | null> {
  return getServerSession(authOptions as any)
}

export type { Session }
