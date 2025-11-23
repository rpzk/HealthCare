-- AlterTable
ALTER TABLE "public"."patients" ADD COLUMN     "householdId" TEXT,
ADD COLUMN     "isHeadOfHousehold" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."households" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "microArea" TEXT,
    "familyType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ciap2" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "gender" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ciap2_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."households"("id") ON DELETE SET NULL ON UPDATE CASCADE;
