-- Migration: Reestruturar CBO e CID com hierarquia completa
-- Objetivo: Manter compatibilidade mas adicionar níveis hierárquicos específicos
-- Data: 2026-03-01

-- ========================================
-- PARTE 1: CBO - Classificação Brasileira de Ocupações
-- ========================================

-- 1.1. Criar tabelas hierárquicas específicas do CBO
CREATE TABLE IF NOT EXISTS "cbo_grande_grupos" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "cbo_grande_grupos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cbo_subgrupos_principais" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "grandeGrupoId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "cbo_subgrupos_principais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cbo_subgrupos_principais_grandeGrupoId_fkey" 
    FOREIGN KEY ("grandeGrupoId") REFERENCES "cbo_grande_grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "cbo_subgrupos" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subgrupoPrincipalId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "cbo_subgrupos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cbo_subgrupos_subgrupoPrincipalId_fkey" 
    FOREIGN KEY ("subgrupoPrincipalId") REFERENCES "cbo_subgrupos_principais"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "cbo_familias" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subgrupoId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "cbo_familias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cbo_familias_subgrupoId_fkey" 
    FOREIGN KEY ("subgrupoId") REFERENCES "cbo_subgrupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 1.2. Adicionar colunas na tabela occupations para relacionamento hierárquico
ALTER TABLE "occupations" ADD COLUMN IF NOT EXISTS "familiaId" TEXT;
ALTER TABLE "occupations" ADD COLUMN IF NOT EXISTS "grandeGrupoCode" TEXT; -- Denormalizado para busca rápida
ALTER TABLE "occupations" ADD COLUMN IF NOT EXISTS "familiaCode" TEXT;     -- Denormalizado para busca rápida

-- 1.3. Criar índices
CREATE UNIQUE INDEX IF NOT EXISTS "cbo_grande_grupos_code_key" ON "cbo_grande_grupos"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "cbo_subgrupos_principais_code_key" ON "cbo_subgrupos_principais"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "cbo_subgrupos_code_key" ON "cbo_subgrupos"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "cbo_familias_code_key" ON "cbo_familias"("code");

CREATE INDEX IF NOT EXISTS "cbo_subgrupos_principais_grandeGrupoId_idx" ON "cbo_subgrupos_principais"("grandeGrupoId");
CREATE INDEX IF NOT EXISTS "cbo_subgrupos_subgrupoPrincipalId_idx" ON "cbo_subgrupos"("subgrupoPrincipalId");
CREATE INDEX IF NOT EXISTS "cbo_familias_subgrupoId_idx" ON "cbo_familias"("subgrupoId");
CREATE INDEX IF NOT EXISTS "occupations_familiaId_idx" ON "occupations"("familiaId");

-- 1.4. Adicionar FK na occupations
ALTER TABLE "occupations" 
  ADD CONSTRAINT IF NOT EXISTS "occupations_familiaId_fkey" 
  FOREIGN KEY ("familiaId") REFERENCES "cbo_familias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ========================================
-- PARTE 2: CID-10 - Classificação Internacional de Doenças
-- ========================================

-- 2.1. Criar tabelas hierárquicas específicas do CID-10
CREATE TABLE IF NOT EXISTS "cid10_capitulos" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,           -- Ex: "I", "II", "III"
  "codeRange" TEXT NOT NULL,      -- Ex: "A00-B99"
  "name" TEXT NOT NULL,           -- Ex: "Algumas doenças infecciosas e parasitárias"
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "cid10_capitulos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cid10_grupos" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,           -- Ex: "A00-A09"
  "name" TEXT NOT NULL,           -- Ex: "Doenças infecciosas intestinais"
  "description" TEXT,
  "capituloId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "cid10_grupos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cid10_grupos_capituloId_fkey" 
    FOREIGN KEY ("capituloId") REFERENCES "cid10_capitulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "cid10_categorias" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,           -- Ex: "A00"
  "name" TEXT NOT NULL,           -- Ex: "Cólera"
  "description" TEXT,
  "grupoId" TEXT NOT NULL,
  "sexRestriction" TEXT,          -- M/F/null
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "cid10_categorias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cid10_categorias_grupoId_fkey" 
    FOREIGN KEY ("grupoId") REFERENCES "cid10_grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 2.2. Adicionar colunas na tabela medical_codes para relacionamento hierárquico
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "capituloId" TEXT;
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "grupoId" TEXT;
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "categoriaId" TEXT;
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "capituloCode" TEXT; -- Denormalizado
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "grupoCode" TEXT;    -- Denormalizado

-- 2.3. Criar índices
CREATE UNIQUE INDEX IF NOT EXISTS "cid10_capitulos_code_key" ON "cid10_capitulos"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "cid10_grupos_code_key" ON "cid10_grupos"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "cid10_categorias_code_key" ON "cid10_categorias"("code");

CREATE INDEX IF NOT EXISTS "cid10_grupos_capituloId_idx" ON "cid10_grupos"("capituloId");
CREATE INDEX IF NOT EXISTS "cid10_categorias_grupoId_idx" ON "cid10_categorias"("grupoId");
CREATE INDEX IF NOT EXISTS "medical_codes_capituloId_idx" ON "medical_codes"("capituloId");
CREATE INDEX IF NOT EXISTS "medical_codes_grupoId_idx" ON "medical_codes"("grupoId");
CREATE INDEX IF NOT EXISTS "medical_codes_categoriaId_idx" ON "medical_codes"("categoriaId");

-- 2.4. Adicionar FKs na medical_codes
ALTER TABLE "medical_codes" 
  ADD CONSTRAINT IF NOT EXISTS "medical_codes_capituloId_fkey" 
  FOREIGN KEY ("capituloId") REFERENCES "cid10_capitulos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "medical_codes" 
  ADD CONSTRAINT IF NOT EXISTS "medical_codes_grupoId_fkey" 
  FOREIGN KEY ("grupoId") REFERENCES "cid10_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "medical_codes" 
  ADD CONSTRAINT IF NOT EXISTS "medical_codes_categoriaId_fkey" 
  FOREIGN KEY ("categoriaId") REFERENCES "cid10_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ========================================
-- PARTE 3: Views de Compatibilidade
-- ========================================

-- 3.1. View para manter compatibilidade com código que usa cbo_groups
CREATE OR REPLACE VIEW "cbo_groups_compat" AS
SELECT 
  id,
  code,
  name,
  1 as level,
  NULL::TEXT as "parentId",
  "createdAt",
  "updatedAt"
FROM "cbo_grande_grupos"
UNION ALL
SELECT 
  id,
  code,
  name,
  2 as level,
  "grandeGrupoId" as "parentId",
  "createdAt",
  "updatedAt"
FROM "cbo_subgrupos_principais"
UNION ALL
SELECT 
  id,
  code,
  name,
  3 as level,
  "subgrupoPrincipalId" as "parentId",
  "createdAt",
  "updatedAt"
FROM "cbo_subgrupos"
UNION ALL
SELECT 
  id,
  code,
  name,
  4 as level,
  "subgrupoId" as "parentId",
  "createdAt",
  "updatedAt"
FROM "cbo_familias";

-- ========================================
-- PARTE 4: Comentários e Documentação
-- ========================================

COMMENT ON TABLE "cbo_grande_grupos" IS 'CBO Nível 1: 10 grandes grupos ocupacionais (ex: Membros das forças armadas)';
COMMENT ON TABLE "cbo_subgrupos_principais" IS 'CBO Nível 2: Subgrupos principais (ex: Oficiais das forças armadas)';
COMMENT ON TABLE "cbo_subgrupos" IS 'CBO Nível 3: Subgrupos detalhados';
COMMENT ON TABLE "cbo_familias" IS 'CBO Nível 4: Famílias ocupacionais';
COMMENT ON TABLE "occupations" IS 'CBO Nível 5: Ocupações específicas (~2.650 ocupações)';

COMMENT ON TABLE "cid10_capitulos" IS 'CID-10 Nível 1: 22 capítulos (I-XXII)';
COMMENT ON TABLE "cid10_grupos" IS 'CID-10 Nível 2: Grupos de doenças (ex: A00-A09)';
COMMENT ON TABLE "cid10_categorias" IS 'CID-10 Nível 3: Categorias (3 caracteres, ex: A00)';
COMMENT ON TABLE "medical_codes" IS 'CID-10 Nível 4: Subcategorias (4+ caracteres, ex: A00.0)';
