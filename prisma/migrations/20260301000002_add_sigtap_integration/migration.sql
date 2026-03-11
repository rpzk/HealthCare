-- =====================================================
-- MIGRATION: Integração Completa SIGTAP + CBO Múltiplos
-- Data: 2026-03-01
-- Descrição: Adiciona estrutura completa para:
--   - Múltiplos CBOs por profissional
--   - SIGTAP hierárquico completo
--   - Compatibilidades CBO×Procedimento e CID×Procedimento
--   - Auditoria e custos de procedimentos em consultas
-- =====================================================

-- ============================================================
-- PARTE 1: Vínculos Profissional × CBO (Múltiplos CBOs)
-- ============================================================

CREATE TABLE IF NOT EXISTS "user_occupations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "occupationId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "licenseNumber" TEXT,
  "licenseState" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "familiaId" TEXT,
  "grandeGrupoCode" TEXT,
  "familiaCode" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_occupations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_occupations_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "occupations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_occupations_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "cbo_familias"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_occupations_userId_occupationId_key" ON "user_occupations"("userId", "occupationId");
CREATE INDEX IF NOT EXISTS "user_occupations_userId_isPrimary_idx" ON "user_occupations"("userId", "isPrimary");
CREATE INDEX IF NOT EXISTS "user_occupations_occupationId_idx" ON "user_occupations"("occupationId");
CREATE INDEX IF NOT EXISTS "user_occupations_grandeGrupoCode_idx" ON "user_occupations"("grandeGrupoCode");
CREATE INDEX IF NOT EXISTS "user_occupations_familiaId_idx" ON "user_occupations"("familiaId");

COMMENT ON TABLE "user_occupations" IS 'Vínculos entre profissionais e ocupações CBO (N:N). Permite que um profissional tenha múltiplos CBOs (ex: médico com várias especialidades).';

-- ============================================================
-- PARTE 2: SIGTAP Hierárquico Completo
-- ============================================================

-- Nível 1: Grupos
CREATE TABLE IF NOT EXISTS "sigtap_grupos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "sigtap_grupos_code_idx" ON "sigtap_grupos"("code");

COMMENT ON TABLE "sigtap_grupos" IS 'Nível 1 da hierarquia SIGTAP: Grupos de procedimentos (2 dígitos). Ex: 01 - Ações de promoção e prevenção em saúde.';

-- Nível 2: Subgrupos
CREATE TABLE IF NOT EXISTS "sigtap_subgrupos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "grupoId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sigtap_subgrupos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "sigtap_grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "sigtap_subgrupos_grupoId_idx" ON "sigtap_subgrupos"("grupoId");
CREATE INDEX IF NOT EXISTS "sigtap_subgrupos_code_idx" ON "sigtap_subgrupos"("code");

COMMENT ON TABLE "sigtap_subgrupos" IS 'Nível 2 da hierarquia SIGTAP: Subgrupos (4 dígitos). Ex: 0101 - Ações coletivas/individuais em saúde.';

-- Nível 3: Formas de Organização
CREATE TABLE IF NOT EXISTS "sigtap_formas_organizacao" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subgrupoId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sigtap_formas_organizacao_subgrupoId_fkey" FOREIGN KEY ("subgrupoId") REFERENCES "sigtap_subgrupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "sigtap_formas_organizacao_subgrupoId_idx" ON "sigtap_formas_organizacao"("subgrupoId");
CREATE INDEX IF NOT EXISTS "sigtap_formas_organizacao_code_idx" ON "sigtap_formas_organizacao"("code");

COMMENT ON TABLE "sigtap_formas_organizacao" IS 'Nível 3 da hierarquia SIGTAP: Formas de Organização (6 dígitos). Ex: 010101 - Vacinação.';

-- Tabelas Auxiliares: Financiamento
CREATE TABLE IF NOT EXISTS "sigtap_financiamentos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "sigtap_financiamentos_code_idx" ON "sigtap_financiamentos"("code");

COMMENT ON TABLE "sigtap_financiamentos" IS 'Tipos de financiamento SIGTAP. Ex: FAB (Financiamento da Atenção Básica), FAE (Financiamento da Atenção Especializada).';

-- Tabelas Auxiliares: Rubrica
CREATE TABLE IF NOT EXISTS "sigtap_rubricas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "sigtap_rubricas_code_idx" ON "sigtap_rubricas"("code");

COMMENT ON TABLE "sigtap_rubricas" IS 'Rubricas de financiamento SIGTAP. Ex: Atenção Básica, Atenção Especializada.';

-- Tabelas Auxiliares: Modalidade
CREATE TABLE IF NOT EXISTS "sigtap_modalidades" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "sigtap_modalidades_code_idx" ON "sigtap_modalidades"("code");

COMMENT ON TABLE "sigtap_modalidades" IS 'Modalidades de atendimento SIGTAP. Ex: 01 - Ambulatorial, 02 - Hospitalar.';

-- Nível 4: Procedimentos (código completo 10 dígitos)
CREATE TABLE IF NOT EXISTS "sigtap_procedimentos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "grupoId" TEXT,
  "subgrupoId" TEXT,
  "formaOrganizacaoId" TEXT,
  "financiamentoId" TEXT,
  "rubricaId" TEXT,
  "modalidadeId" TEXT,
  "valorSH" INTEGER,
  "valorSA" INTEGER,
  "valorSP" INTEGER,
  "complexity" INTEGER,
  "minAge" INTEGER,
  "maxAge" INTEGER,
  "sexRestriction" TEXT,
  "qtMaximaExecucao" INTEGER,
  "qtDiasPermanencia" INTEGER,
  "pontos" DECIMAL(10,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "competencia" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sigtap_procedimentos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "sigtap_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sigtap_procedimentos_subgrupoId_fkey" FOREIGN KEY ("subgrupoId") REFERENCES "sigtap_subgrupos"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sigtap_procedimentos_formaOrganizacaoId_fkey" FOREIGN KEY ("formaOrganizacaoId") REFERENCES "sigtap_formas_organizacao"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sigtap_procedimentos_financiamentoId_fkey" FOREIGN KEY ("financiamentoId") REFERENCES "sigtap_financiamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sigtap_procedimentos_rubricaId_fkey" FOREIGN KEY ("rubricaId") REFERENCES "sigtap_rubricas"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "sigtap_procedimentos_modalidadeId_fkey" FOREIGN KEY ("modalidadeId") REFERENCES "sigtap_modalidades"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "sigtap_procedimentos_code_idx" ON "sigtap_procedimentos"("code");
CREATE INDEX IF NOT EXISTS "sigtap_procedimentos_grupoId_idx" ON "sigtap_procedimentos"("grupoId");
CREATE INDEX IF NOT EXISTS "sigtap_procedimentos_subgrupoId_idx" ON "sigtap_procedimentos"("subgrupoId");
CREATE INDEX IF NOT EXISTS "sigtap_procedimentos_formaOrganizacaoId_idx" ON "sigtap_procedimentos"("formaOrganizacaoId");
CREATE INDEX IF NOT EXISTS "sigtap_procedimentos_financiamentoId_idx" ON "sigtap_procedimentos"("financiamentoId");
CREATE INDEX IF NOT EXISTS "sigtap_procedimentos_competencia_idx" ON "sigtap_procedimentos"("competencia");
CREATE INDEX IF NOT EXISTS "sigtap_procedimentos_active_idx" ON "sigtap_procedimentos"("active");

COMMENT ON TABLE "sigtap_procedimentos" IS 'Nível 4 da hierarquia SIGTAP: Procedimentos completos (10 dígitos). Ex: 0101010012 - Administração de medicamentos na atenção básica. Valores em centavos para precisão.';

-- ============================================================
-- PARTE 3: Compatibilidades (CBO × Procedimento, CID × Procedimento)
-- ============================================================

-- Compatibilidade: Procedimento × CBO
CREATE TABLE IF NOT EXISTS "procedure_cbo_compatibility" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "procedureId" TEXT NOT NULL,
  "occupationCode" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "competencia" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "procedure_cbo_compatibility_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "sigtap_procedimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "procedure_cbo_compatibility_procedureId_occupationCode_key" ON "procedure_cbo_compatibility"("procedureId", "occupationCode");
CREATE INDEX IF NOT EXISTS "procedure_cbo_compatibility_procedureId_idx" ON "procedure_cbo_compatibility"("procedureId");
CREATE INDEX IF NOT EXISTS "procedure_cbo_compatibility_occupationCode_idx" ON "procedure_cbo_compatibility"("occupationCode");
CREATE INDEX IF NOT EXISTS "procedure_cbo_compatibility_type_idx" ON "procedure_cbo_compatibility"("type");

COMMENT ON TABLE "procedure_cbo_compatibility" IS 'Define quais CBOs podem executar cada procedimento SIGTAP. Suporta wildcards (ex: "2231*" para todos os médicos). Tipos: OBRIGATORIA, PERMITIDA, SUGERIDA.';

-- Compatibilidade: Procedimento × CID
CREATE TABLE IF NOT EXISTS "procedure_cid_compatibility" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "procedureId" TEXT NOT NULL,
  "cidCode" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "competencia" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "procedure_cid_compatibility_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "sigtap_procedimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "procedure_cid_compatibility_procedureId_cidCode_key" ON "procedure_cid_compatibility"("procedureId", "cidCode");
CREATE INDEX IF NOT EXISTS "procedure_cid_compatibility_procedureId_idx" ON "procedure_cid_compatibility"("procedureId");
CREATE INDEX IF NOT EXISTS "procedure_cid_compatibility_cidCode_idx" ON "procedure_cid_compatibility"("cidCode");
CREATE INDEX IF NOT EXISTS "procedure_cid_compatibility_type_idx" ON "procedure_cid_compatibility"("type");

COMMENT ON TABLE "procedure_cid_compatibility" IS 'Define quais CIDs justificam cada procedimento SIGTAP. Tipos: OBRIGATORIA, PERMITIDA, SUGERIDA, RESTRITA.';

-- ============================================================
-- PARTE 4: Procedimentos Executados em Consultas (Auditoria + Custos)
-- ============================================================

CREATE TABLE IF NOT EXISTS "consultation_procedures" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "consultationId" TEXT NOT NULL,
  "procedureId" TEXT NOT NULL,
  "executorId" TEXT NOT NULL,
  "executorCBOId" TEXT,
  "isCompatibleCBO" BOOLEAN NOT NULL DEFAULT false,
  "isCompatibleCID" BOOLEAN NOT NULL DEFAULT false,
  "validationErrors" TEXT,
  "valorSH" INTEGER,
  "valorSA" INTEGER,
  "valorSP" INTEGER,
  "valorTotal" INTEGER,
  "competenciaFat" TEXT,
  "statusFat" TEXT,
  "motivoGlosa" TEXT,
  "dataEnvioFat" TIMESTAMP(3),
  "dataPagamento" TIMESTAMP(3),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consultation_procedures_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "consultation_procedures_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "sigtap_procedimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "consultation_procedures_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "consultation_procedures_executorCBOId_fkey" FOREIGN KEY ("executorCBOId") REFERENCES "user_occupations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "consultation_procedures_consultationId_idx" ON "consultation_procedures"("consultationId");
CREATE INDEX IF NOT EXISTS "consultation_procedures_procedureId_idx" ON "consultation_procedures"("procedureId");
CREATE INDEX IF NOT EXISTS "consultation_procedures_executorId_idx" ON "consultation_procedures"("executorId");
CREATE INDEX IF NOT EXISTS "consultation_procedures_executorCBOId_idx" ON "consultation_procedures"("executorCBOId");
CREATE INDEX IF NOT EXISTS "consultation_procedures_competenciaFat_idx" ON "consultation_procedures"("competenciaFat");
CREATE INDEX IF NOT EXISTS "consultation_procedures_statusFat_idx" ON "consultation_procedures"("statusFat");
CREATE INDEX IF NOT EXISTS "consultation_procedures_createdAt_idx" ON "consultation_procedures"("createdAt");

COMMENT ON TABLE "consultation_procedures" IS 'Registro de procedimentos SIGTAP executados durante consultas. Permite auditoria completa, validação de compatibilidades, cálculo de custos e controle de faturamento SUS. Valores em centavos.';

-- ============================================================
-- PARTE 5: Adicionar campos na tabela consultations
-- ============================================================

ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "totalCustoSH" INTEGER;
ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "totalCustoSA" INTEGER;
ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "totalCustoSP" INTEGER;
ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "totalCusto" INTEGER;

COMMENT ON COLUMN "consultations"."totalCustoSH" IS 'Total de custos com Serviço Hospitalar (em centavos) - denormalizado para performance.';
COMMENT ON COLUMN "consultations"."totalCustoSA" IS 'Total de custos com Serviço Ambulatorial (em centavos) - denormalizado para performance.';
COMMENT ON COLUMN "consultations"."totalCustoSP" IS 'Total de custos com Serviço Profissional (em centavos) - denormalizado para performance.';
COMMENT ON COLUMN "consultations"."totalCusto" IS 'Total geral de custos da consulta (em centavos) - denormalizado para performance.';
