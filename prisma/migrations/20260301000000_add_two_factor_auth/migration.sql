-- AlterTable (tabela mapeada como "users" no Prisma)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabledAt" TIMESTAMP(3);
