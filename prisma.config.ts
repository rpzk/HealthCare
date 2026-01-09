import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Use process.env directly so commands like `prisma generate` can run in environments
    // where DATABASE_URL isn't injected (e.g. type-check only pipelines).
    url: process.env.DATABASE_URL ?? '',
  },
})
