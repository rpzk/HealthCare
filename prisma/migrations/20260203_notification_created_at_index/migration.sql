-- CreateIndex: otimiza listagem de notificações por usuário ordenada por data (reduz lentidão em /api/notifications)
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);
