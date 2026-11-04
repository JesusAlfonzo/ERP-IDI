-- CreateEnum
CREATE TYPE "LabInternalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "LabWeeklyRunStatus" AS ENUM ('OPEN_ACCUMULATING', 'CLOSED_RECONCILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepeatReason" AS ENUM ('CALIBRATION_FAILURE', 'CRITICAL_VALUE_CONFIRMATION', 'COMPLEX_SAMPLE', 'OPERATOR_ERROR', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsumptionConcept" AS ENUM ('PATIENT', 'REPEAT', 'CALIBRATION', 'CONTROL', 'WASTE', 'YIELD_SURPLUS', 'YIELD_DEFICIT', 'QUARANTINE_LOCK');

-- AlterTable
ALTER TABLE "lab_reagent_units" ADD COLUMN     "assigned_lab_area_id" INTEGER;

-- CreateTable
CREATE TABLE "lab_internal_requests" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "lab_area_id" INTEGER NOT NULL,
    "requested_by_id" INTEGER NOT NULL,
    "reviewed_by_id" INTEGER,
    "status" "LabInternalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT NOT NULL,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "lab_internal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_internal_request_items" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "product_id" BIGINT NOT NULL,
    "requested_uses_or_units" INTEGER NOT NULL,
    "assigned_lab_unit_id" BIGINT,

    CONSTRAINT "lab_internal_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_weekly_runs" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "lab_area_id" INTEGER NOT NULL,
    "lab_exam_id" INTEGER NOT NULL,
    "bioanalyst_id" INTEGER NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_end_date" TIMESTAMP(3) NOT NULL,
    "status" "LabWeeklyRunStatus" NOT NULL DEFAULT 'OPEN_ACCUMULATING',
    "total_valid_patient_exams" INTEGER NOT NULL DEFAULT 0,
    "total_run_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "effective_cost_per_exam" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "notes" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_weekly_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_run_consumptions" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "lab_reagent_unit_id" BIGINT NOT NULL,
    "external_calibrator_unit_id" BIGINT,
    "patient_uses" INTEGER NOT NULL DEFAULT 0,
    "repeat_uses" INTEGER NOT NULL DEFAULT 0,
    "repeat_reason" "RepeatReason",
    "calibrator_uses" INTEGER NOT NULL DEFAULT 0,
    "calibrator_notes" TEXT,
    "control_uses" INTEGER NOT NULL DEFAULT 0,
    "waste_uses" INTEGER NOT NULL DEFAULT 0,
    "total_deducted_uses" INTEGER NOT NULL DEFAULT 0,
    "calculated_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,

    CONSTRAINT "lab_run_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_consumption_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "lab_area_id" INTEGER,
    "research_trial_id" INTEGER,
    "lab_exam_id" INTEGER,
    "weekly_run_id" INTEGER,
    "lab_reagent_unit_id" BIGINT NOT NULL,
    "concept" "ConsumptionConcept" NOT NULL,
    "uses_count" INTEGER NOT NULL,
    "cost_impact" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_consumption_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_internal_requests_code_key" ON "lab_internal_requests"("code");

-- CreateIndex
CREATE UNIQUE INDEX "lab_weekly_runs_code_key" ON "lab_weekly_runs"("code");

-- CreateIndex
CREATE INDEX "lab_consumption_audit_logs_lab_reagent_unit_id_created_at_idx" ON "lab_consumption_audit_logs"("lab_reagent_unit_id", "created_at");

-- CreateIndex
CREATE INDEX "lab_consumption_audit_logs_lab_area_id_concept_idx" ON "lab_consumption_audit_logs"("lab_area_id", "concept");

-- AddForeignKey
ALTER TABLE "lab_reagent_units" ADD CONSTRAINT "lab_reagent_units_assigned_lab_area_id_fkey" FOREIGN KEY ("assigned_lab_area_id") REFERENCES "lab_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_internal_requests" ADD CONSTRAINT "lab_internal_requests_lab_area_id_fkey" FOREIGN KEY ("lab_area_id") REFERENCES "lab_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_internal_requests" ADD CONSTRAINT "lab_internal_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_internal_requests" ADD CONSTRAINT "lab_internal_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_internal_request_items" ADD CONSTRAINT "lab_internal_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "lab_internal_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_internal_request_items" ADD CONSTRAINT "lab_internal_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_internal_request_items" ADD CONSTRAINT "lab_internal_request_items_assigned_lab_unit_id_fkey" FOREIGN KEY ("assigned_lab_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_weekly_runs" ADD CONSTRAINT "lab_weekly_runs_lab_area_id_fkey" FOREIGN KEY ("lab_area_id") REFERENCES "lab_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_weekly_runs" ADD CONSTRAINT "lab_weekly_runs_lab_exam_id_fkey" FOREIGN KEY ("lab_exam_id") REFERENCES "lab_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_weekly_runs" ADD CONSTRAINT "lab_weekly_runs_bioanalyst_id_fkey" FOREIGN KEY ("bioanalyst_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_run_consumptions" ADD CONSTRAINT "lab_run_consumptions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "lab_weekly_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_run_consumptions" ADD CONSTRAINT "lab_run_consumptions_lab_reagent_unit_id_fkey" FOREIGN KEY ("lab_reagent_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_run_consumptions" ADD CONSTRAINT "lab_run_consumptions_external_calibrator_unit_id_fkey" FOREIGN KEY ("external_calibrator_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_consumption_audit_logs" ADD CONSTRAINT "lab_consumption_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_consumption_audit_logs" ADD CONSTRAINT "lab_consumption_audit_logs_lab_area_id_fkey" FOREIGN KEY ("lab_area_id") REFERENCES "lab_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_consumption_audit_logs" ADD CONSTRAINT "lab_consumption_audit_logs_lab_exam_id_fkey" FOREIGN KEY ("lab_exam_id") REFERENCES "lab_exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_consumption_audit_logs" ADD CONSTRAINT "lab_consumption_audit_logs_weekly_run_id_fkey" FOREIGN KEY ("weekly_run_id") REFERENCES "lab_weekly_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_consumption_audit_logs" ADD CONSTRAINT "lab_consumption_audit_logs_lab_reagent_unit_id_fkey" FOREIGN KEY ("lab_reagent_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
