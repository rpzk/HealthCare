// Este arquivo documenta as mudanças necessárias no schema do banco de dados
// Para adicionar suporte ao Dashboard de Análise de Questionários

// VERIFICAÇÃO: Os seguintes campos já devem existir em PatientQuestionnaire:
// - id: String @id
// - patientId: String
// - templateId: String
// - status: String (PENDING | IN_PROGRESS | COMPLETED | EXPIRED | CANCELLED)
// - sentAt: DateTime
// - completedAt: DateTime?
// - expiresAt: DateTime?
// - progressPercent: Int
// - aiAnalysis: Json?
// - aiAnalyzedAt: DateTime?
// - answers: QuestionnaireAnswer[]
// - template: QuestionnaireTemplate
// - patient: Patient

// VERIFICAÇÃO: Os seguintes campos já devem existir em Notification:
// - id: String @id
// - userId: String
// - type: String
// - title: String
// - message: String
// - read: Boolean @default(false)
// - createdAt: DateTime @default(now())
// - metadata: Json? (para armazenar dados adicionais)

// Se algum campo estiver faltando, execute um 'npx prisma migrate dev'

// ÍNDICES RECOMENDADOS para melhor performance:
// - PatientQuestionnaire.status
// - PatientQuestionnaire.sentAt
// - PatientQuestionnaire.aiAnalysis
// - Notification.userId
// - Notification.read
// - Notification.type

// Exemplo de Prisma migration que pode ser necessária:
/*
-- CreateIndex
CREATE INDEX "PatientQuestionnaire_status_idx" ON "PatientQuestionnaire"("status");

-- CreateIndex
CREATE INDEX "PatientQuestionnaire_sentAt_idx" ON "PatientQuestionnaire"("sentAt");

-- CreateIndex
CREATE INDEX "PatientQuestionnaire_aiAnalysis_idx" ON "PatientQuestionnaire"("aiAnalysis");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
*/
