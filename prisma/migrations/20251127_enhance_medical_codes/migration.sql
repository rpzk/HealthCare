-- AlterTable: Adicionar campos do sistema legado SSF para MedicalCode
-- Estes campos melhoram a classificação CID-10 com informações adicionais

ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "chapter" VARCHAR(5);
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "is_category" BOOLEAN DEFAULT false;
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "sex_restriction" VARCHAR(1);
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "cross_asterisk" VARCHAR(15);
ALTER TABLE "medical_codes" ADD COLUMN IF NOT EXISTS "short_description" TEXT;

-- Índice para buscas por capítulo (útil para filtros)
CREATE INDEX IF NOT EXISTS "medical_codes_chapter_idx" ON "medical_codes" ("chapter");

-- Índice para filtrar por restrição de sexo (útil em contextos clínicos)
CREATE INDEX IF NOT EXISTS "medical_codes_sex_restriction_idx" ON "medical_codes" ("sex_restriction");

-- Comentários explicativos
COMMENT ON COLUMN "medical_codes"."chapter" IS 'Capítulo do CID-10 (I-XXII)';
COMMENT ON COLUMN "medical_codes"."is_category" IS 'Se é uma categoria principal (sem subcódigos)';
COMMENT ON COLUMN "medical_codes"."sex_restriction" IS 'Restrição de sexo: M=masculino, F=feminino, NULL=ambos';
COMMENT ON COLUMN "medical_codes"."cross_asterisk" IS 'Sistema cruz/asterisco: ETIOLOGY (+) ou MANIFESTATION (*)';
COMMENT ON COLUMN "medical_codes"."short_description" IS 'Descrição curta/abreviada do código';
