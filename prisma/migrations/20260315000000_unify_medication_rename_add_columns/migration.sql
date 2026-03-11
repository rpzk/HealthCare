-- Unificar Medication + RENAMEMedication: adicionar campos RENAME em Medication
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "codigoCATMAT" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "componente" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "apresentacao" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "controlado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "antimicrobiano" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "altoValor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "usoHospitalar" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "programaEspecifico" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "atenEspecializada" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "medications_codigoCATMAT_key" ON "medications"("codigoCATMAT") WHERE "codigoCATMAT" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "medications_codigoCATMAT_idx" ON "medications"("codigoCATMAT") WHERE "codigoCATMAT" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "medications_controlado_idx" ON "medications"("controlado");
CREATE INDEX IF NOT EXISTS "medications_antimicrobiano_idx" ON "medications"("antimicrobiano");
