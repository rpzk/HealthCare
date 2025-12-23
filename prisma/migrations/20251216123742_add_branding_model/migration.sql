-- CreateTable
CREATE TABLE "public"."branding" (
    "id" TEXT NOT NULL,
    "clinicName" TEXT,
    "logoUrl" TEXT,
    "headerUrl" TEXT,
    "footerText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_pkey" PRIMARY KEY ("id")
);
