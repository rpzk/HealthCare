/*
  Warnings:

  - You are about to drop the column `cross_asterisk` on the `medical_codes` table. All the data in the column will be lost.
  - You are about to drop the column `is_category` on the `medical_codes` table. All the data in the column will be lost.
  - You are about to drop the column `sex_restriction` on the `medical_codes` table. All the data in the column will be lost.
  - You are about to drop the column `short_description` on the `medical_codes` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AssessmentType" AS ENUM ('SELF', 'MANAGER', 'PEER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "public"."AssessmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."QuestionCategory" AS ENUM ('TIME_HORIZON', 'COMPLEXITY', 'ABSTRACTION', 'UNCERTAINTY', 'DECISION_MAKING', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('SCENARIO', 'SCALE', 'RANKING', 'OPEN');

-- CreateEnum
CREATE TYPE "public"."Virtue" AS ENUM ('WISDOM', 'COURAGE', 'HUMANITY', 'JUSTICE', 'TEMPERANCE', 'TRANSCENDENCE');

-- CreateEnum
CREATE TYPE "public"."TargetAudience" AS ENUM ('STAFF', 'PATIENT', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."GoalCategory" AS ENUM ('HEALTH', 'MENTAL', 'CAREER', 'RELATIONSHIPS', 'PERSONAL', 'SPIRITUAL');

-- CreateEnum
CREATE TYPE "public"."GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ActionFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ONCE');

-- CreateEnum
CREATE TYPE "public"."InsuranceType" AS ENUM ('PRIVATE', 'SUS', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('VACATION', 'SICK_LEAVE', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'PERSONAL', 'TRAINING', 'COMPENSATORY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'FULL_DAY', 'ON_CALL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."MeasureUnit" AS ENUM ('UNIT', 'BOX', 'PACK', 'BOTTLE', 'AMPULE', 'TUBE', 'BAG', 'KIT', 'LITER', 'ML', 'GRAM', 'KG', 'METER', 'CM', 'ROLL', 'PAIR');

-- CreateEnum
CREATE TYPE "public"."MovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOSS', 'RETURN', 'CONSUMPTION');

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PrescriptionType" AS ENUM ('SYMPTOMATIC', 'CONTINUOUS', 'CONTROLLED', 'BLUE_B', 'YELLOW_A', 'PHYTOTHERAPIC');

-- CreateEnum
CREATE TYPE "public"."ExamCategory" AS ENUM ('LABORATORY', 'RADIOLOGY', 'ECG', 'PHYSIOTHERAPY', 'APAC', 'CYTOPATHOLOGY', 'MAMMOGRAPHY', 'ULTRASOUND', 'LAB_ALTERNATIVE', 'RAD_ALTERNATIVE', 'OTHER_1', 'OTHER_2');

-- CreateEnum
CREATE TYPE "public"."ProtocolCategory" AS ENUM ('HYPERTENSION', 'DIABETES', 'PRENATAL', 'CHILDCARE', 'MENTAL_HEALTH', 'RESPIRATORY', 'INFECTIOUS', 'CHRONIC', 'PREVENTIVE', 'EMERGENCY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."HealthDeviceType" AS ENUM ('BLOOD_PRESSURE', 'GLUCOMETER', 'PULSE_OXIMETER', 'THERMOMETER', 'SCALE', 'HEART_RATE', 'ECG', 'STETHOSCOPE', 'OTOSCOPE', 'DERMATOSCOPE', 'SPIROMETER', 'SLEEP_TRACKER', 'ACTIVITY_TRACKER', 'CGM', 'SMARTWATCH', 'FITNESS_BAND', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DeviceDataSource" AS ENUM ('APPLE_HEALTHKIT', 'GOOGLE_FIT', 'HEALTH_CONNECT', 'DIRECT_BLUETOOTH', 'DIRECT_WIFI', 'MANUAL_ENTRY', 'API_INTEGRATION', 'FHIR', 'OPEN_MHEALTH');

-- CreateEnum
CREATE TYPE "public"."DeviceConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'PAIRING', 'ERROR', 'NEEDS_AUTH');

-- CreateEnum
CREATE TYPE "public"."ReadingType" AS ENUM ('BLOOD_PRESSURE_SYSTOLIC', 'BLOOD_PRESSURE_DIASTOLIC', 'BLOOD_PRESSURE', 'HEART_RATE', 'HEART_RATE_VARIABILITY', 'ECG_RHYTHM', 'OXYGEN_SATURATION', 'RESPIRATORY_RATE', 'PEAK_FLOW', 'FEV1', 'BLOOD_GLUCOSE', 'BLOOD_GLUCOSE_FASTING', 'BLOOD_GLUCOSE_POSTMEAL', 'KETONES', 'WEIGHT', 'BMI', 'BODY_FAT', 'MUSCLE_MASS', 'BONE_MASS', 'WATER_PERCENTAGE', 'VISCERAL_FAT', 'BODY_TEMPERATURE', 'SKIN_TEMPERATURE', 'SLEEP_DURATION', 'SLEEP_DEEP', 'SLEEP_REM', 'SLEEP_LIGHT', 'SLEEP_AWAKE', 'SLEEP_SCORE', 'STEPS', 'DISTANCE', 'CALORIES_BURNED', 'ACTIVE_MINUTES', 'FLOORS_CLIMBED', 'EXERCISE_DURATION', 'STRESS_LEVEL', 'MINDFULNESS_MINUTES', 'HEART_SOUND', 'LUNG_SOUND', 'EAR_IMAGE', 'SKIN_IMAGE', 'HYDRATION', 'MENSTRUAL_CYCLE', 'MEDICATION_TAKEN', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReadingContext" AS ENUM ('FASTING', 'BEFORE_MEAL', 'AFTER_MEAL', 'BEFORE_EXERCISE', 'AFTER_EXERCISE', 'RESTING', 'ACTIVE', 'SLEEPING', 'WAKING', 'BEDTIME', 'STRESSED', 'RELAXED', 'ILL', 'MEDICATED');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."SyncStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "public"."BiometricDataType" AS ENUM ('HEART_RATE', 'BLOOD_PRESSURE', 'OXYGEN_SATURATION', 'BLOOD_GLUCOSE', 'BODY_TEMPERATURE', 'WEIGHT', 'BODY_COMPOSITION', 'STEPS', 'DISTANCE', 'CALORIES', 'ACTIVITY', 'SLEEP', 'HEART_SOUNDS', 'RESPIRATORY', 'ECG', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ConsentAction" AS ENUM ('GRANTED', 'REVOKED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "public"."TherapeuticSystem" AS ENUM ('AYURVEDA', 'HOMEOPATHY', 'TCM', 'ANTHROPOSOPHY', 'NATUROPATHY', 'FUNCTIONAL', 'GENERAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."IntakeQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'TEXT', 'IMAGE_CHOICE', 'YES_NO', 'BODY_MAP');

-- CreateEnum
CREATE TYPE "public"."QuestionnaireStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WaitingListStatus" AS ENUM ('ACTIVE', 'NOTIFIED', 'SCHEDULED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RecordingStatus" AS ENUM ('RECORDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."CertificateType" AS ENUM ('MEDICAL_LEAVE', 'FITNESS', 'ACCOMPANIMENT', 'TIME_OFF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."NpsScore" AS ENUM ('DETRACTOR', 'PASSIVE', 'PROMOTER');

-- CreateEnum
CREATE TYPE "public"."CertificateAuthority" AS ENUM ('A1', 'A3', 'A4');

-- CreateEnum
CREATE TYPE "public"."SignedDocumentType" AS ENUM ('MEDICAL_RECORD', 'MEDICAL_CERTIFICATE', 'PRESCRIPTION', 'EXAM_REQUEST', 'EXAM_RESULT', 'REFERRAL', 'CONSENT_FORM', 'TELECONSULTATION', 'DISCHARGE_SUMMARY');

-- CreateEnum
CREATE TYPE "public"."AuditAlertType" AS ENUM ('FAILED_LOGIN_ATTEMPTS', 'UNAUTHORIZED_ACCESS', 'DATA_EXPORT_BULK', 'ROLE_PRIVILEGE_ESCALATION', 'AFTER_HOURS_ACCESS', 'UNUSUAL_ACTIVITY_PATTERN', 'SENSITIVE_DATA_ACCESS', 'GDPR_DATA_DELETION', 'FAILED_AUDIT_VALIDATION', 'CRITICAL_ERROR');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE', 'IGNORED');

-- CreateEnum
CREATE TYPE "public"."BadgeRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "public"."WellnessPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('MEDICATION', 'CONSULTATION', 'EXAM', 'VITAL', 'MILESTONE', 'APPOINTMENT', 'DIAGNOSIS', 'TREATMENT');

-- DropIndex
DROP INDEX "public"."medical_codes_sex_restriction_idx";

-- AlterTable
ALTER TABLE "public"."addresses" ADD COLUMN     "areaId" TEXT,
ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "districtId" TEXT,
ADD COLUMN     "neighborhoodId" TEXT,
ADD COLUMN     "stateId" TEXT,
ADD COLUMN     "subprefectureId" TEXT,
ADD COLUMN     "zoneId" TEXT;

-- AlterTable
ALTER TABLE "public"."audit_logs" ALTER COLUMN "resourceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."consultations" ADD COLUMN     "alcoholUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "childCare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "continuedCare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "diabetes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "drugUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ecg" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "examEvaluation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeVisit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hypertension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "immediateDemand" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "laboratory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leprosy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mammography" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentalHealth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "obstetricUltrasound" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orientationOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pathology" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "physiotherapy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postpartum" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prenatal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prescriptionRenewal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preventive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "radiology" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referralMade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledDemand" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stdAids" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tuberculosis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultrasound" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urgencyWithObs" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."financial_transactions" ADD COLUMN     "insuranceId" TEXT;

-- AlterTable
ALTER TABLE "public"."households" ADD COLUMN     "areaId" TEXT,
ADD COLUMN     "economicClass" TEXT,
ADD COLUMN     "hasElectricity" BOOLEAN DEFAULT false,
ADD COLUMN     "hasGarbage" BOOLEAN DEFAULT false,
ADD COLUMN     "hasSewage" BOOLEAN DEFAULT false,
ADD COLUMN     "hasWater" BOOLEAN DEFAULT false,
ADD COLUMN     "microAreaId" TEXT,
ADD COLUMN     "monthlyIncome" DOUBLE PRECISION,
ADD COLUMN     "numberOfRooms" INTEGER,
ADD COLUMN     "vulnerabilityScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."medical_codes" DROP COLUMN "cross_asterisk",
DROP COLUMN "is_category",
DROP COLUMN "sex_restriction",
DROP COLUMN "short_description",
ADD COLUMN     "crossAsterisk" TEXT,
ADD COLUMN     "isCategory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sexRestriction" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ALTER COLUMN "chapter" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."micro_areas" ADD COLUMN     "areaId" TEXT;

-- AlterTable
ALTER TABLE "public"."patients" ADD COLUMN     "economicClass" TEXT,
ADD COLUMN     "familyNumber" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "monthlyFamilyIncome" DOUBLE PRECISION,
ADD COLUMN     "preferredAddressId" TEXT,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "rgState" TEXT,
ADD COLUMN     "sequenceInFamily" INTEGER,
ADD COLUMN     "socialVulnerability" TEXT;

-- AlterTable
ALTER TABLE "public"."system_settings" ADD COLUMN     "encrypted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "acsAssignedMicroAreaId" TEXT,
ADD COLUMN     "assignedAreaId" TEXT;

-- CreateTable
CREATE TABLE "public"."webauthn_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT,
    "authenticatorAttachment" TEXT,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_assigned_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "user_assigned_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stratum_assessments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentType" "public"."AssessmentType" NOT NULL DEFAULT 'SELF',
    "status" "public"."AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "calculatedStratum" "public"."StratumLevel",
    "timeSpanMonths" INTEGER,
    "confidenceScore" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "stratum_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stratum_assessment_responses" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "timeSpanValue" INTEGER,
    "score" DOUBLE PRECISION,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stratum_assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stratum_questions" (
    "id" TEXT NOT NULL,
    "category" "public"."QuestionCategory" NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "public"."QuestionType" NOT NULL DEFAULT 'SCENARIO',
    "options" TEXT NOT NULL,
    "stratumMapping" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stratum_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_stratum_profiles" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "minStratum" "public"."StratumLevel" NOT NULL,
    "optimalStratum" "public"."StratumLevel" NOT NULL,
    "maxStratum" "public"."StratumLevel",
    "timeSpanMinMonths" INTEGER NOT NULL,
    "timeSpanMaxMonths" INTEGER,
    "complexityFactors" TEXT,
    "keyResponsibilities" TEXT,
    "decisionTypes" TEXT,
    "cboCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_stratum_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."character_strengths" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "virtue" "public"."Virtue" NOT NULL,
    "description" TEXT NOT NULL,
    "examples" TEXT,
    "healthTips" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "character_strengths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."strength_assessments" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "assessmentType" "public"."AssessmentType" NOT NULL DEFAULT 'SELF',
    "status" "public"."AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "strength_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."strength_assessment_responses" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strength_assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."strength_questions" (
    "id" TEXT NOT NULL,
    "strengthCode" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "public"."QuestionType" NOT NULL DEFAULT 'SCALE',
    "options" TEXT NOT NULL,
    "targetAudience" "public"."TargetAudience" NOT NULL DEFAULT 'BOTH',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "strength_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."strength_assessment_results" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "strengthId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER,
    "isTopFive" BOOLEAN NOT NULL DEFAULT false,
    "isGem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "strength_assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."development_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "title" TEXT NOT NULL,
    "futureVision" TEXT,
    "currentStratum" "public"."StratumLevel",
    "targetStratum" "public"."StratumLevel",
    "primaryStrengths" TEXT,
    "developmentAreas" TEXT,
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."development_goals" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."GoalCategory" NOT NULL,
    "strengthCode" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "public"."GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goal_actions" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "public"."ActionFrequency" NOT NULL DEFAULT 'DAILY',
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."development_milestones" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "achievedAt" TIMESTAMP(3),
    "celebration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "development_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."health_insurances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."InsuranceType" NOT NULL DEFAULT 'PRIVATE',
    "code" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "billingAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "coveragePercentage" INTEGER NOT NULL DEFAULT 100,
    "copayAmount" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_insurances" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "cardNumber" TEXT,
    "validUntil" TIMESTAMP(3),
    "plan" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_entries" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftType" "public"."ShiftType" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "notes" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_bank" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "scheduleEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vacation_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalDays" INTEGER NOT NULL DEFAULT 30,
    "usedDays" INTEGER NOT NULL DEFAULT 0,
    "pendingDays" INTEGER NOT NULL DEFAULT 0,
    "referenceYear" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "unit" "public"."MeasureUnit" NOT NULL DEFAULT 'UNIT',
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "reorderPoint" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "requiresLot" BOOLEAN NOT NULL DEFAULT false,
    "costPrice" DOUBLE PRECISION,
    "sellPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."storage_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "lotNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "lastCountDate" TIMESTAMP(3),
    "lastCountQty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "public"."MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "lotNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "referenceType" TEXT,
    "referenceId" TEXT,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "bankInfo" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "lotNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "synonym" TEXT,
    "tradeName" TEXT,
    "prescriptionType" "public"."PrescriptionType" NOT NULL DEFAULT 'SYMPTOMATIC',
    "basicPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "municipalPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "statePharmacy" BOOLEAN NOT NULL DEFAULT false,
    "homePharmacy" BOOLEAN NOT NULL DEFAULT false,
    "popularPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "hospitalPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "commercialPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "compoundPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "susCode" TEXT,
    "instructions" TEXT,
    "notes" TEXT,
    "description" TEXT,
    "warnings" TEXT,
    "interactions" TEXT,
    "observations" TEXT,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "sexRestriction" TEXT,
    "validityDays" INTEGER,
    "route" TEXT,
    "strength" TEXT,
    "unit" TEXT,
    "form" TEXT,
    "packaging" TEXT,
    "packageSize" INTEGER,
    "dosePerKg" DOUBLE PRECISION,
    "maxDailyDosePerKg" DOUBLE PRECISION,
    "defaultFrequency" DOUBLE PRECISION,
    "defaultDuration" INTEGER,
    "maxQuantity" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicationId" TEXT,
    "customName" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "quantity" INTEGER,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."formula_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ingredients" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "notes" TEXT,
    "indications" TEXT,
    "contraindications" TEXT,
    "sideEffects" TEXT,
    "interactions" TEXT,
    "monitoring" TEXT,
    "duration" TEXT,
    "source" TEXT,
    "pharmacy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formula_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."procedures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "complexity" INTEGER,
    "financing" TEXT,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "sexRestriction" TEXT,
    "group" TEXT,
    "subgroup" TEXT,
    "cboRequired" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "examCategory" "public"."ExamCategory" NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "sexRestriction" TEXT,
    "susCode" TEXT,
    "preparation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."ExamCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_combo_items" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."protocols" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."ProtocolCategory" NOT NULL DEFAULT 'CUSTOM',
    "doctorId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "specialty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."protocol_prescriptions" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "medicationId" TEXT,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT,
    "quantity" DOUBLE PRECISION,
    "route" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "protocol_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."protocol_exams" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "examCatalogId" TEXT,
    "examName" TEXT NOT NULL,
    "description" TEXT,
    "priority" "public"."Urgency" NOT NULL DEFAULT 'ROUTINE',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "protocol_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."protocol_referrals" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "public"."Urgency" NOT NULL DEFAULT 'ROUTINE',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "protocol_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."protocol_diagnoses" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "medicalCodeId" TEXT,
    "cidCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "protocol_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."connected_devices" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "deviceType" "public"."HealthDeviceType" NOT NULL,
    "deviceName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "firmwareVersion" TEXT,
    "dataSource" "public"."DeviceDataSource" NOT NULL,
    "connectionStatus" "public"."DeviceConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSyncAt" TIMESTAMP(3),
    "syncFrequency" INTEGER,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnAbnormal" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_readings" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "patientId" TEXT NOT NULL,
    "readingType" "public"."ReadingType" NOT NULL,
    "primaryValue" DOUBLE PRECISION NOT NULL,
    "secondaryValue" DOUBLE PRECISION,
    "tertiaryValue" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" "public"."ReadingContext",
    "notes" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "invalidReason" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "alertSeverity" "public"."AlertSeverity",
    "alertTriggered" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reading_thresholds" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "readingType" "public"."ReadingType" NOT NULL,
    "criticalLow" DOUBLE PRECISION,
    "warningLow" DOUBLE PRECISION,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "warningHigh" DOUBLE PRECISION,
    "criticalHigh" DOUBLE PRECISION,
    "context" "public"."ReadingContext",
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_sync_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dataSource" "public"."DeviceDataSource" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "readingsImported" INTEGER NOT NULL DEFAULT 0,
    "readingsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."SyncStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "errorMessage" TEXT,

    CONSTRAINT "device_sync_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "patientName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "cpf" TEXT,
    "customMessage" TEXT,
    "consentAcceptedAt" TIMESTAMP(3),
    "consentIpAddress" TEXT,
    "consentUserAgent" TEXT,
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_biometric_consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "inviteId" TEXT,
    "dataType" "public"."BiometricDataType" NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "purpose" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_biometric_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consent_audit_logs" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dataType" "public"."BiometricDataType" NOT NULL,
    "action" "public"."ConsentAction" NOT NULL,
    "previousValue" BOOLEAN,
    "newValue" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questionnaire_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "patientIntro" TEXT,
    "therapeuticSystem" "public"."TherapeuticSystem" NOT NULL DEFAULT 'GENERAL',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "allowPause" BOOLEAN NOT NULL DEFAULT true,
    "showProgress" BOOLEAN NOT NULL DEFAULT true,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "themeColor" TEXT,
    "iconEmoji" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "aiAnalysisPrompt" TEXT,
    "scoringLogic" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."intake_categories" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "iconEmoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."intake_questions" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "helpText" TEXT,
    "imageUrl" TEXT,
    "type" "public"."IntakeQuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scaleMin" INTEGER,
    "scaleMax" INTEGER,
    "scaleMinLabel" TEXT,
    "scaleMaxLabel" TEXT,
    "analysisMapping" JSONB,
    "conditionalLogic" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."intake_question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "emoji" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scoreValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_questionnaires" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "status" "public"."QuestionnaireStatus" NOT NULL DEFAULT 'PENDING',
    "accessToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastQuestionId" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "aiAnalysis" JSONB,
    "aiAnalyzedAt" TIMESTAMP(3),
    "professionalNotes" TEXT,
    "consultationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_answers" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "textValue" TEXT,
    "numericValue" DOUBLE PRECISION,
    "booleanValue" BOOLEAN,
    "selectedOptionId" TEXT,
    "selectedOptionIds" TEXT[],
    "bodyMapData" JSONB,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSpentSeconds" INTEGER,

    CONSTRAINT "patient_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_care_team" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'CONSULTATION',
    "addedById" TEXT,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_care_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."waiting_lists" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "specialty" TEXT,
    "preferredDays" TEXT[],
    "preferredTimes" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 5,
    "urgencyReason" TEXT,
    "status" "public"."WaitingListStatus" NOT NULL DEFAULT 'ACTIVE',
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "lastNotifiedAt" TIMESTAMP(3),
    "appointmentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "waiting_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TelemedicineRecording" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "public"."RecordingStatus" NOT NULL DEFAULT 'RECORDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "filePath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
    "format" TEXT NOT NULL DEFAULT 'webm',
    "patientConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelemedicineRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecordingAccessToken" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordingAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicalCertificate" (
    "id" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "consultationId" TEXT,
    "type" "public"."CertificateType" NOT NULL DEFAULT 'MEDICAL_LEAVE',
    "days" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "includeCid" BOOLEAN NOT NULL DEFAULT false,
    "cidCode" TEXT,
    "cidDescription" TEXT,
    "title" TEXT NOT NULL DEFAULT 'ATESTADO MÉDICO',
    "content" TEXT NOT NULL,
    "observations" TEXT,
    "pdfPath" TEXT,
    "pdfHash" TEXT,
    "qrCodeData" TEXT,
    "digitalSignature" TEXT,
    "certificateChain" TEXT,
    "timestamp" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NpsResponse" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "category" "public"."NpsScore" NOT NULL,
    "feedback" TEXT,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentViaWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "whatsAppMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpsResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DigitalCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificateType" "public"."CertificateAuthority" NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "notBefore" TIMESTAMP(3) NOT NULL,
    "notAfter" TIMESTAMP(3) NOT NULL,
    "certificatePem" TEXT NOT NULL,
    "publicKeyPem" TEXT NOT NULL,
    "isHardwareToken" BOOLEAN NOT NULL DEFAULT false,
    "tokenSerialNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SignedDocument" (
    "id" TEXT NOT NULL,
    "documentType" "public"."SignedDocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signatureAlgorithm" TEXT NOT NULL,
    "signatureValue" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "timestampAuthority" TEXT,
    "timestampToken" TEXT,
    "timestampedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "geolocation" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "validatedAt" TIMESTAMP(3),
    "validationResult" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditAlert" (
    "id" TEXT NOT NULL,
    "alertType" "public"."AuditAlertType" NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "auditLogIds" TEXT[],
    "metadata" JSONB,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "notifiedVia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_mood_logs" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "mood" SMALLINT NOT NULL,
    "energy" SMALLINT NOT NULL,
    "stress" SMALLINT NOT NULL,
    "sleep" SMALLINT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_mood_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_aptitudes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_aptitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_badges" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "public"."BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_development_plans" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "phases" JSONB NOT NULL,
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."WellnessPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_development_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_health_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "impact" TEXT,
    "causalite" TEXT,
    "vitalsSnapshot" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_wellness_scores" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "moodComponent" DOUBLE PRECISION NOT NULL,
    "adherenceComponent" DOUBLE PRECISION NOT NULL,
    "vitalComponent" DOUBLE PRECISION NOT NULL,
    "emotionalComponent" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_wellness_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_journals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "weekStarting" TIMESTAMP(3) NOT NULL,
    "reflection" TEXT NOT NULL,
    "insights" TEXT,
    "goals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."states" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "countryId" TEXT NOT NULL DEFAULT 'br',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cities" (
    "id" TEXT NOT NULL,
    "ibgeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."zones" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."districts" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subprefectures" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subprefectures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."neighborhoods" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "subprefectureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."areas" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "neighborhoodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."acs_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "microAreaId" TEXT,
    "areaId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "assignmentReason" TEXT,
    "assignedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acs_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medication_takings" (
    "id" TEXT NOT NULL,
    "prescriptionItemId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "dosage" TEXT NOT NULL,
    "missed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_takings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_credentials_credentialId_key" ON "public"."webauthn_credentials"("credentialId");

-- CreateIndex
CREATE INDEX "webauthn_credentials_userId_idx" ON "public"."webauthn_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_assigned_roles_userId_role_key" ON "public"."user_assigned_roles"("userId", "role");

-- CreateIndex
CREATE INDEX "stratum_assessments_userId_status_idx" ON "public"."stratum_assessments"("userId", "status");

-- CreateIndex
CREATE INDEX "stratum_assessments_completedAt_idx" ON "public"."stratum_assessments"("completedAt");

-- CreateIndex
CREATE INDEX "stratum_assessment_responses_assessmentId_idx" ON "public"."stratum_assessment_responses"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "stratum_assessment_responses_assessmentId_questionId_key" ON "public"."stratum_assessment_responses"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "stratum_questions_category_active_idx" ON "public"."stratum_questions"("category", "active");

-- CreateIndex
CREATE UNIQUE INDEX "job_stratum_profiles_jobRoleId_key" ON "public"."job_stratum_profiles"("jobRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "character_strengths_code_key" ON "public"."character_strengths"("code");

-- CreateIndex
CREATE INDEX "strength_assessments_userId_status_idx" ON "public"."strength_assessments"("userId", "status");

-- CreateIndex
CREATE INDEX "strength_assessments_patientId_status_idx" ON "public"."strength_assessments"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "strength_assessment_responses_assessmentId_questionId_key" ON "public"."strength_assessment_responses"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "strength_questions_strengthCode_active_idx" ON "public"."strength_questions"("strengthCode", "active");

-- CreateIndex
CREATE UNIQUE INDEX "strength_assessment_results_assessmentId_strengthId_key" ON "public"."strength_assessment_results"("assessmentId", "strengthId");

-- CreateIndex
CREATE INDEX "development_plans_userId_status_idx" ON "public"."development_plans"("userId", "status");

-- CreateIndex
CREATE INDEX "development_plans_patientId_status_idx" ON "public"."development_plans"("patientId", "status");

-- CreateIndex
CREATE INDEX "development_goals_planId_status_idx" ON "public"."development_goals"("planId", "status");

-- CreateIndex
CREATE INDEX "goal_actions_goalId_completed_idx" ON "public"."goal_actions"("goalId", "completed");

-- CreateIndex
CREATE INDEX "development_milestones_planId_achieved_idx" ON "public"."development_milestones"("planId", "achieved");

-- CreateIndex
CREATE UNIQUE INDEX "health_insurances_code_key" ON "public"."health_insurances"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patient_insurances_patientId_insuranceId_key" ON "public"."patient_insurances"("patientId", "insuranceId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_entries_scheduleId_userId_date_key" ON "public"."schedule_entries"("scheduleId", "userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "vacation_balances_userId_key" ON "public"."vacation_balances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "public"."product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "public"."products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "public"."products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_name_key" ON "public"."storage_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_locationId_lotNumber_key" ON "public"."inventory"("productId", "locationId", "lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_document_key" ON "public"."suppliers"("document");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "public"."purchase_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "medications_name_idx" ON "public"."medications"("name");

-- CreateIndex
CREATE INDEX "medications_susCode_idx" ON "public"."medications"("susCode");

-- CreateIndex
CREATE INDEX "formula_templates_name_idx" ON "public"."formula_templates"("name");

-- CreateIndex
CREATE INDEX "formula_templates_category_idx" ON "public"."formula_templates"("category");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_code_key" ON "public"."procedures"("code");

-- CreateIndex
CREATE INDEX "procedures_code_idx" ON "public"."procedures"("code");

-- CreateIndex
CREATE INDEX "procedures_name_idx" ON "public"."procedures"("name");

-- CreateIndex
CREATE INDEX "exam_catalog_name_idx" ON "public"."exam_catalog"("name");

-- CreateIndex
CREATE INDEX "exam_catalog_examCategory_idx" ON "public"."exam_catalog"("examCategory");

-- CreateIndex
CREATE INDEX "exam_combos_name_idx" ON "public"."exam_combos"("name");

-- CreateIndex
CREATE INDEX "exam_combos_category_idx" ON "public"."exam_combos"("category");

-- CreateIndex
CREATE INDEX "exam_combos_isActive_idx" ON "public"."exam_combos"("isActive");

-- CreateIndex
CREATE INDEX "exam_combo_items_comboId_idx" ON "public"."exam_combo_items"("comboId");

-- CreateIndex
CREATE INDEX "exam_combo_items_examId_idx" ON "public"."exam_combo_items"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_combo_items_comboId_examId_key" ON "public"."exam_combo_items"("comboId", "examId");

-- CreateIndex
CREATE INDEX "protocols_doctorId_idx" ON "public"."protocols"("doctorId");

-- CreateIndex
CREATE INDEX "protocols_category_idx" ON "public"."protocols"("category");

-- CreateIndex
CREATE INDEX "protocols_name_idx" ON "public"."protocols"("name");

-- CreateIndex
CREATE INDEX "protocol_prescriptions_protocolId_idx" ON "public"."protocol_prescriptions"("protocolId");

-- CreateIndex
CREATE INDEX "protocol_exams_protocolId_idx" ON "public"."protocol_exams"("protocolId");

-- CreateIndex
CREATE INDEX "protocol_referrals_protocolId_idx" ON "public"."protocol_referrals"("protocolId");

-- CreateIndex
CREATE INDEX "protocol_diagnoses_protocolId_idx" ON "public"."protocol_diagnoses"("protocolId");

-- CreateIndex
CREATE INDEX "connected_devices_patientId_idx" ON "public"."connected_devices"("patientId");

-- CreateIndex
CREATE INDEX "connected_devices_deviceType_idx" ON "public"."connected_devices"("deviceType");

-- CreateIndex
CREATE UNIQUE INDEX "connected_devices_patientId_serialNumber_key" ON "public"."connected_devices"("patientId", "serialNumber");

-- CreateIndex
CREATE INDEX "device_readings_patientId_readingType_idx" ON "public"."device_readings"("patientId", "readingType");

-- CreateIndex
CREATE INDEX "device_readings_deviceId_measuredAt_idx" ON "public"."device_readings"("deviceId", "measuredAt");

-- CreateIndex
CREATE INDEX "device_readings_measuredAt_idx" ON "public"."device_readings"("measuredAt");

-- CreateIndex
CREATE INDEX "device_readings_isAbnormal_idx" ON "public"."device_readings"("isAbnormal");

-- CreateIndex
CREATE INDEX "reading_thresholds_readingType_idx" ON "public"."reading_thresholds"("readingType");

-- CreateIndex
CREATE UNIQUE INDEX "reading_thresholds_patientId_readingType_context_key" ON "public"."reading_thresholds"("patientId", "readingType", "context");

-- CreateIndex
CREATE INDEX "device_sync_sessions_patientId_idx" ON "public"."device_sync_sessions"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_invites_token_key" ON "public"."patient_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "patient_invites_patientId_key" ON "public"."patient_invites"("patientId");

-- CreateIndex
CREATE INDEX "patient_invites_email_idx" ON "public"."patient_invites"("email");

-- CreateIndex
CREATE INDEX "patient_invites_token_idx" ON "public"."patient_invites"("token");

-- CreateIndex
CREATE INDEX "patient_biometric_consents_patientId_idx" ON "public"."patient_biometric_consents"("patientId");

-- CreateIndex
CREATE INDEX "patient_biometric_consents_inviteId_idx" ON "public"."patient_biometric_consents"("inviteId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_biometric_consents_patientId_dataType_key" ON "public"."patient_biometric_consents"("patientId", "dataType");

-- CreateIndex
CREATE INDEX "consent_audit_logs_patientId_idx" ON "public"."consent_audit_logs"("patientId");

-- CreateIndex
CREATE INDEX "intake_categories_templateId_idx" ON "public"."intake_categories"("templateId");

-- CreateIndex
CREATE INDEX "intake_questions_categoryId_idx" ON "public"."intake_questions"("categoryId");

-- CreateIndex
CREATE INDEX "intake_question_options_questionId_idx" ON "public"."intake_question_options"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_questionnaires_accessToken_key" ON "public"."patient_questionnaires"("accessToken");

-- CreateIndex
CREATE INDEX "patient_questionnaires_patientId_idx" ON "public"."patient_questionnaires"("patientId");

-- CreateIndex
CREATE INDEX "patient_questionnaires_templateId_idx" ON "public"."patient_questionnaires"("templateId");

-- CreateIndex
CREATE INDEX "patient_questionnaires_accessToken_idx" ON "public"."patient_questionnaires"("accessToken");

-- CreateIndex
CREATE INDEX "patient_answers_questionnaireId_idx" ON "public"."patient_answers"("questionnaireId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_answers_questionnaireId_questionId_key" ON "public"."patient_answers"("questionnaireId", "questionId");

-- CreateIndex
CREATE INDEX "patient_care_team_patientId_idx" ON "public"."patient_care_team"("patientId");

-- CreateIndex
CREATE INDEX "patient_care_team_userId_idx" ON "public"."patient_care_team"("userId");

-- CreateIndex
CREATE INDEX "patient_care_team_isActive_idx" ON "public"."patient_care_team"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "patient_care_team_patientId_userId_key" ON "public"."patient_care_team"("patientId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "waiting_lists_appointmentId_key" ON "public"."waiting_lists"("appointmentId");

-- CreateIndex
CREATE INDEX "waiting_lists_patientId_idx" ON "public"."waiting_lists"("patientId");

-- CreateIndex
CREATE INDEX "waiting_lists_doctorId_idx" ON "public"."waiting_lists"("doctorId");

-- CreateIndex
CREATE INDEX "waiting_lists_status_idx" ON "public"."waiting_lists"("status");

-- CreateIndex
CREATE INDEX "waiting_lists_priority_idx" ON "public"."waiting_lists"("priority");

-- CreateIndex
CREATE INDEX "TelemedicineRecording_consultationId_idx" ON "public"."TelemedicineRecording"("consultationId");

-- CreateIndex
CREATE INDEX "TelemedicineRecording_doctorId_idx" ON "public"."TelemedicineRecording"("doctorId");

-- CreateIndex
CREATE INDEX "TelemedicineRecording_patientId_idx" ON "public"."TelemedicineRecording"("patientId");

-- CreateIndex
CREATE INDEX "TelemedicineRecording_status_idx" ON "public"."TelemedicineRecording"("status");

-- CreateIndex
CREATE INDEX "TelemedicineRecording_createdAt_idx" ON "public"."TelemedicineRecording"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingAccessToken_token_key" ON "public"."RecordingAccessToken"("token");

-- CreateIndex
CREATE INDEX "RecordingAccessToken_recordingId_idx" ON "public"."RecordingAccessToken"("recordingId");

-- CreateIndex
CREATE INDEX "RecordingAccessToken_userId_idx" ON "public"."RecordingAccessToken"("userId");

-- CreateIndex
CREATE INDEX "RecordingAccessToken_token_idx" ON "public"."RecordingAccessToken"("token");

-- CreateIndex
CREATE INDEX "RecordingAccessToken_expiresAt_idx" ON "public"."RecordingAccessToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalCertificate_sequenceNumber_key" ON "public"."MedicalCertificate"("sequenceNumber");

-- CreateIndex
CREATE INDEX "MedicalCertificate_patientId_idx" ON "public"."MedicalCertificate"("patientId");

-- CreateIndex
CREATE INDEX "MedicalCertificate_doctorId_idx" ON "public"."MedicalCertificate"("doctorId");

-- CreateIndex
CREATE INDEX "MedicalCertificate_consultationId_idx" ON "public"."MedicalCertificate"("consultationId");

-- CreateIndex
CREATE INDEX "MedicalCertificate_sequenceNumber_year_idx" ON "public"."MedicalCertificate"("sequenceNumber", "year");

-- CreateIndex
CREATE INDEX "MedicalCertificate_issuedAt_idx" ON "public"."MedicalCertificate"("issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NpsResponse_consultationId_key" ON "public"."NpsResponse"("consultationId");

-- CreateIndex
CREATE INDEX "NpsResponse_patientId_idx" ON "public"."NpsResponse"("patientId");

-- CreateIndex
CREATE INDEX "NpsResponse_doctorId_idx" ON "public"."NpsResponse"("doctorId");

-- CreateIndex
CREATE INDEX "NpsResponse_consultationId_idx" ON "public"."NpsResponse"("consultationId");

-- CreateIndex
CREATE INDEX "NpsResponse_score_idx" ON "public"."NpsResponse"("score");

-- CreateIndex
CREATE INDEX "NpsResponse_category_idx" ON "public"."NpsResponse"("category");

-- CreateIndex
CREATE INDEX "NpsResponse_respondedAt_idx" ON "public"."NpsResponse"("respondedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalCertificate_serialNumber_key" ON "public"."DigitalCertificate"("serialNumber");

-- CreateIndex
CREATE INDEX "DigitalCertificate_userId_idx" ON "public"."DigitalCertificate"("userId");

-- CreateIndex
CREATE INDEX "DigitalCertificate_notAfter_idx" ON "public"."DigitalCertificate"("notAfter");

-- CreateIndex
CREATE INDEX "DigitalCertificate_isActive_idx" ON "public"."DigitalCertificate"("isActive");

-- CreateIndex
CREATE INDEX "SignedDocument_documentType_documentId_idx" ON "public"."SignedDocument"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "SignedDocument_signerId_idx" ON "public"."SignedDocument"("signerId");

-- CreateIndex
CREATE INDEX "SignedDocument_certificateId_idx" ON "public"."SignedDocument"("certificateId");

-- CreateIndex
CREATE INDEX "SignedDocument_signedAt_idx" ON "public"."SignedDocument"("signedAt");

-- CreateIndex
CREATE INDEX "AuditAlert_alertType_idx" ON "public"."AuditAlert"("alertType");

-- CreateIndex
CREATE INDEX "AuditAlert_severity_idx" ON "public"."AuditAlert"("severity");

-- CreateIndex
CREATE INDEX "AuditAlert_status_idx" ON "public"."AuditAlert"("status");

-- CreateIndex
CREATE INDEX "AuditAlert_userId_idx" ON "public"."AuditAlert"("userId");

-- CreateIndex
CREATE INDEX "AuditAlert_createdAt_idx" ON "public"."AuditAlert"("createdAt");

-- CreateIndex
CREATE INDEX "patient_mood_logs_patientId_createdAt_idx" ON "public"."patient_mood_logs"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "patient_aptitudes_patientId_category_idx" ON "public"."patient_aptitudes"("patientId", "category");

-- CreateIndex
CREATE INDEX "patient_aptitudes_patientId_score_idx" ON "public"."patient_aptitudes"("patientId", "score");

-- CreateIndex
CREATE INDEX "patient_badges_patientId_rarity_idx" ON "public"."patient_badges"("patientId", "rarity");

-- CreateIndex
CREATE INDEX "patient_badges_patientId_unlockedAt_idx" ON "public"."patient_badges"("patientId", "unlockedAt");

-- CreateIndex
CREATE INDEX "patient_development_plans_patientId_status_idx" ON "public"."patient_development_plans"("patientId", "status");

-- CreateIndex
CREATE INDEX "patient_development_plans_patientId_targetDate_idx" ON "public"."patient_development_plans"("patientId", "targetDate");

-- CreateIndex
CREATE INDEX "patient_health_events_patientId_eventDate_idx" ON "public"."patient_health_events"("patientId", "eventDate");

-- CreateIndex
CREATE INDEX "patient_health_events_patientId_type_idx" ON "public"."patient_health_events"("patientId", "type");

-- CreateIndex
CREATE INDEX "patient_wellness_scores_patientId_calculatedAt_idx" ON "public"."patient_wellness_scores"("patientId", "calculatedAt");

-- CreateIndex
CREATE INDEX "patient_journals_patientId_weekStarting_idx" ON "public"."patient_journals"("patientId", "weekStarting");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "public"."countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "public"."countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "public"."states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "states_name_key" ON "public"."states"("name");

-- CreateIndex
CREATE INDEX "states_countryId_idx" ON "public"."states"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "cities_ibgeCode_key" ON "public"."cities"("ibgeCode");

-- CreateIndex
CREATE INDEX "cities_stateId_idx" ON "public"."cities"("stateId");

-- CreateIndex
CREATE INDEX "cities_ibgeCode_idx" ON "public"."cities"("ibgeCode");

-- CreateIndex
CREATE UNIQUE INDEX "cities_stateId_name_key" ON "public"."cities"("stateId", "name");

-- CreateIndex
CREATE INDEX "zones_cityId_idx" ON "public"."zones"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "zones_cityId_name_key" ON "public"."zones"("cityId", "name");

-- CreateIndex
CREATE INDEX "districts_zoneId_idx" ON "public"."districts"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "districts_zoneId_name_key" ON "public"."districts"("zoneId", "name");

-- CreateIndex
CREATE INDEX "subprefectures_districtId_idx" ON "public"."subprefectures"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "subprefectures_districtId_name_key" ON "public"."subprefectures"("districtId", "name");

-- CreateIndex
CREATE INDEX "neighborhoods_subprefectureId_idx" ON "public"."neighborhoods"("subprefectureId");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_subprefectureId_name_key" ON "public"."neighborhoods"("subprefectureId", "name");

-- CreateIndex
CREATE INDEX "areas_neighborhoodId_idx" ON "public"."areas"("neighborhoodId");

-- CreateIndex
CREATE UNIQUE INDEX "areas_neighborhoodId_name_key" ON "public"."areas"("neighborhoodId", "name");

-- CreateIndex
CREATE INDEX "acs_history_userId_idx" ON "public"."acs_history"("userId");

-- CreateIndex
CREATE INDEX "acs_history_userId_assignedAt_idx" ON "public"."acs_history"("userId", "assignedAt");

-- CreateIndex
CREATE INDEX "acs_history_microAreaId_idx" ON "public"."acs_history"("microAreaId");

-- CreateIndex
CREATE INDEX "acs_history_areaId_idx" ON "public"."acs_history"("areaId");

-- CreateIndex
CREATE INDEX "medication_takings_prescriptionItemId_idx" ON "public"."medication_takings"("prescriptionItemId");

-- CreateIndex
CREATE INDEX "medication_takings_takenAt_idx" ON "public"."medication_takings"("takenAt");

-- CreateIndex
CREATE INDEX "addresses_countryId_idx" ON "public"."addresses"("countryId");

-- CreateIndex
CREATE INDEX "addresses_stateId_idx" ON "public"."addresses"("stateId");

-- CreateIndex
CREATE INDEX "addresses_cityId_idx" ON "public"."addresses"("cityId");

-- CreateIndex
CREATE INDEX "addresses_zoneId_idx" ON "public"."addresses"("zoneId");

-- CreateIndex
CREATE INDEX "addresses_districtId_idx" ON "public"."addresses"("districtId");

-- CreateIndex
CREATE INDEX "addresses_neighborhoodId_idx" ON "public"."addresses"("neighborhoodId");

-- CreateIndex
CREATE INDEX "addresses_areaId_idx" ON "public"."addresses"("areaId");

-- CreateIndex
CREATE INDEX "addresses_cityId_zoneId_districtId_idx" ON "public"."addresses"("cityId", "zoneId", "districtId");

-- CreateIndex
CREATE INDEX "households_microAreaId_idx" ON "public"."households"("microAreaId");

-- CreateIndex
CREATE INDEX "households_areaId_idx" ON "public"."households"("areaId");

-- CreateIndex
CREATE INDEX "households_vulnerabilityScore_idx" ON "public"."households"("vulnerabilityScore");

-- CreateIndex
CREATE INDEX "medical_codes_sexRestriction_idx" ON "public"."medical_codes"("sexRestriction");

-- CreateIndex
CREATE INDEX "micro_areas_areaId_idx" ON "public"."micro_areas"("areaId");

-- CreateIndex
CREATE INDEX "patients_familyNumber_sequenceInFamily_idx" ON "public"."patients"("familyNumber", "sequenceInFamily");

-- CreateIndex
CREATE INDEX "patients_preferredAddressId_idx" ON "public"."patients"("preferredAddressId");

-- CreateIndex
CREATE INDEX "patients_socialVulnerability_idx" ON "public"."patients"("socialVulnerability");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "public"."system_settings"("category");

-- CreateIndex
CREATE INDEX "users_acsAssignedMicroAreaId_idx" ON "public"."users"("acsAssignedMicroAreaId");

-- CreateIndex
CREATE INDEX "users_assignedAreaId_idx" ON "public"."users"("assignedAreaId");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_acsAssignedMicroAreaId_fkey" FOREIGN KEY ("acsAssignedMicroAreaId") REFERENCES "public"."micro_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_assignedAreaId_fkey" FOREIGN KEY ("assignedAreaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_assigned_roles" ADD CONSTRAINT "user_assigned_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_preferredAddressId_fkey" FOREIGN KEY ("preferredAddressId") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."households" ADD CONSTRAINT "households_microAreaId_fkey" FOREIGN KEY ("microAreaId") REFERENCES "public"."micro_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."households" ADD CONSTRAINT "households_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_subprefectureId_fkey" FOREIGN KEY ("subprefectureId") REFERENCES "public"."subprefectures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "public"."neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."micro_areas" ADD CONSTRAINT "micro_areas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stratum_assessments" ADD CONSTRAINT "stratum_assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stratum_assessment_responses" ADD CONSTRAINT "stratum_assessment_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."stratum_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stratum_assessment_responses" ADD CONSTRAINT "stratum_assessment_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."stratum_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_stratum_profiles" ADD CONSTRAINT "job_stratum_profiles_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "public"."job_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."strength_assessments" ADD CONSTRAINT "strength_assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."strength_assessments" ADD CONSTRAINT "strength_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."strength_assessment_responses" ADD CONSTRAINT "strength_assessment_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."strength_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."strength_assessment_responses" ADD CONSTRAINT "strength_assessment_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."strength_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."strength_assessment_results" ADD CONSTRAINT "strength_assessment_results_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."strength_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."strength_assessment_results" ADD CONSTRAINT "strength_assessment_results_strengthId_fkey" FOREIGN KEY ("strengthId") REFERENCES "public"."character_strengths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."development_plans" ADD CONSTRAINT "development_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."development_plans" ADD CONSTRAINT "development_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."development_goals" ADD CONSTRAINT "development_goals_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."development_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."goal_actions" ADD CONSTRAINT "goal_actions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."development_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."development_milestones" ADD CONSTRAINT "development_milestones_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."development_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_transactions" ADD CONSTRAINT "financial_transactions_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "public"."health_insurances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_insurances" ADD CONSTRAINT "patient_insurances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_insurances" ADD CONSTRAINT "patient_insurances_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "public"."health_insurances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_schedules" ADD CONSTRAINT "work_schedules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_entries" ADD CONSTRAINT "schedule_entries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_entries" ADD CONSTRAINT "schedule_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank" ADD CONSTRAINT "time_bank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vacation_balances" ADD CONSTRAINT "vacation_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "public"."storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "public"."storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescription_items" ADD CONSTRAINT "prescription_items_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "public"."medications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_combos" ADD CONSTRAINT "exam_combos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_combo_items" ADD CONSTRAINT "exam_combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "public"."exam_combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_combo_items" ADD CONSTRAINT "exam_combo_items_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exam_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocols" ADD CONSTRAINT "protocols_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocol_prescriptions" ADD CONSTRAINT "protocol_prescriptions_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "public"."protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocol_prescriptions" ADD CONSTRAINT "protocol_prescriptions_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "public"."medications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocol_exams" ADD CONSTRAINT "protocol_exams_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "public"."protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocol_exams" ADD CONSTRAINT "protocol_exams_examCatalogId_fkey" FOREIGN KEY ("examCatalogId") REFERENCES "public"."exam_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocol_referrals" ADD CONSTRAINT "protocol_referrals_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "public"."protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocol_diagnoses" ADD CONSTRAINT "protocol_diagnoses_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "public"."protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."protocol_diagnoses" ADD CONSTRAINT "protocol_diagnoses_medicalCodeId_fkey" FOREIGN KEY ("medicalCodeId") REFERENCES "public"."medical_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connected_devices" ADD CONSTRAINT "connected_devices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."device_readings" ADD CONSTRAINT "device_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."connected_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."device_readings" ADD CONSTRAINT "device_readings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reading_thresholds" ADD CONSTRAINT "reading_thresholds_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."device_sync_sessions" ADD CONSTRAINT "device_sync_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_invites" ADD CONSTRAINT "patient_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_invites" ADD CONSTRAINT "patient_invites_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_biometric_consents" ADD CONSTRAINT "patient_biometric_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_biometric_consents" ADD CONSTRAINT "patient_biometric_consents_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "public"."patient_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consent_audit_logs" ADD CONSTRAINT "consent_audit_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questionnaire_templates" ADD CONSTRAINT "questionnaire_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."intake_categories" ADD CONSTRAINT "intake_categories_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."questionnaire_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."intake_questions" ADD CONSTRAINT "intake_questions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."intake_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."intake_question_options" ADD CONSTRAINT "intake_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."intake_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_questionnaires" ADD CONSTRAINT "patient_questionnaires_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."questionnaire_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_questionnaires" ADD CONSTRAINT "patient_questionnaires_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_questionnaires" ADD CONSTRAINT "patient_questionnaires_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_questionnaires" ADD CONSTRAINT "patient_questionnaires_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_answers" ADD CONSTRAINT "patient_answers_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "public"."patient_questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_answers" ADD CONSTRAINT "patient_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."intake_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_answers" ADD CONSTRAINT "patient_answers_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "public"."intake_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_care_team" ADD CONSTRAINT "patient_care_team_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_care_team" ADD CONSTRAINT "patient_care_team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_lists" ADD CONSTRAINT "waiting_lists_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_lists" ADD CONSTRAINT "waiting_lists_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_lists" ADD CONSTRAINT "waiting_lists_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelemedicineRecording" ADD CONSTRAINT "TelemedicineRecording_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelemedicineRecording" ADD CONSTRAINT "TelemedicineRecording_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelemedicineRecording" ADD CONSTRAINT "TelemedicineRecording_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordingAccessToken" ADD CONSTRAINT "RecordingAccessToken_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "public"."TelemedicineRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordingAccessToken" ADD CONSTRAINT "RecordingAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NpsResponse" ADD CONSTRAINT "NpsResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NpsResponse" ADD CONSTRAINT "NpsResponse_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NpsResponse" ADD CONSTRAINT "NpsResponse_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigitalCertificate" ADD CONSTRAINT "DigitalCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignedDocument" ADD CONSTRAINT "SignedDocument_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "public"."DigitalCertificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignedDocument" ADD CONSTRAINT "SignedDocument_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_mood_logs" ADD CONSTRAINT "patient_mood_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_aptitudes" ADD CONSTRAINT "patient_aptitudes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_badges" ADD CONSTRAINT "patient_badges_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_development_plans" ADD CONSTRAINT "patient_development_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_health_events" ADD CONSTRAINT "patient_health_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_wellness_scores" ADD CONSTRAINT "patient_wellness_scores_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_journals" ADD CONSTRAINT "patient_journals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."states" ADD CONSTRAINT "states_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cities" ADD CONSTRAINT "cities_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."zones" ADD CONSTRAINT "zones_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."districts" ADD CONSTRAINT "districts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subprefectures" ADD CONSTRAINT "subprefectures_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neighborhoods" ADD CONSTRAINT "neighborhoods_subprefectureId_fkey" FOREIGN KEY ("subprefectureId") REFERENCES "public"."subprefectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."areas" ADD CONSTRAINT "areas_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."acs_history" ADD CONSTRAINT "acs_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."acs_history" ADD CONSTRAINT "acs_history_microAreaId_fkey" FOREIGN KEY ("microAreaId") REFERENCES "public"."micro_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."acs_history" ADD CONSTRAINT "acs_history_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_takings" ADD CONSTRAINT "medication_takings_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "public"."prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
