-- CreateEnum
CREATE TYPE "public"."StratumLevel" AS ENUM ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8');

-- CreateTable
CREATE TABLE "public"."cbo_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cbo_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."occupations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "groupId" TEXT,
    "synonyms" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_roles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "occupationId" TEXT,
    "requiredMinStratum" "public"."StratumLevel" NOT NULL,
    "requiredMaxStratum" "public"."StratumLevel",
    "description" TEXT,
    "tasks" TEXT,
    "capabilitiesJson" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_job_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."capability_evaluations" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "jobRoleId" TEXT,
    "stratumAssessed" "public"."StratumLevel" NOT NULL,
    "potentialStratum" "public"."StratumLevel",
    "timeSpanMonths" INTEGER,
    "evidence" TEXT,
    "gaps" TEXT,
    "recommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capability_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cbo_groups_code_key" ON "public"."cbo_groups"("code");

-- CreateIndex
CREATE INDEX "cbo_groups_level_idx" ON "public"."cbo_groups"("level");

-- CreateIndex
CREATE UNIQUE INDEX "occupations_code_key" ON "public"."occupations"("code");

-- CreateIndex
CREATE INDEX "occupations_groupId_idx" ON "public"."occupations"("groupId");

-- CreateIndex
CREATE INDEX "job_roles_occupationId_idx" ON "public"."job_roles"("occupationId");

-- CreateIndex
CREATE INDEX "user_job_roles_jobRoleId_idx" ON "public"."user_job_roles"("jobRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_job_roles_userId_jobRoleId_key" ON "public"."user_job_roles"("userId", "jobRoleId");

-- CreateIndex
CREATE INDEX "capability_evaluations_subjectUserId_createdAt_idx" ON "public"."capability_evaluations"("subjectUserId", "createdAt");

-- CreateIndex
CREATE INDEX "capability_evaluations_evaluatorUserId_createdAt_idx" ON "public"."capability_evaluations"("evaluatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "capability_evaluations_jobRoleId_idx" ON "public"."capability_evaluations"("jobRoleId");

-- AddForeignKey
ALTER TABLE "public"."cbo_groups" ADD CONSTRAINT "cbo_groups_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."cbo_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occupations" ADD CONSTRAINT "occupations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."cbo_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_roles" ADD CONSTRAINT "job_roles_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "public"."occupations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_job_roles" ADD CONSTRAINT "user_job_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_job_roles" ADD CONSTRAINT "user_job_roles_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "public"."job_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."capability_evaluations" ADD CONSTRAINT "capability_evaluations_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."capability_evaluations" ADD CONSTRAINT "capability_evaluations_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."capability_evaluations" ADD CONSTRAINT "capability_evaluations_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "public"."job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
