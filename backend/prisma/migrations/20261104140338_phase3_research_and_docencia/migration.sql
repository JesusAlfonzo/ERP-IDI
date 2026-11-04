-- CreateEnum
CREATE TYPE "ResearchProjectType" AS ENUM ('TEACHING', 'THESIS', 'INSTITUTIONAL', 'EXTERNAL_COLLABORATION');

-- CreateEnum
CREATE TYPE "ResearchProjectStatus" AS ENUM ('FORMULATION', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResearchMemberRole" AS ENUM ('PRINCIPAL_INVESTIGATOR', 'CO_INVESTIGATOR', 'PROFESSOR', 'THESIS_STUDENT', 'LAB_ASSISTANT');

-- CreateEnum
CREATE TYPE "ResearchInvestorType" AS ENUM ('PUBLIC_GRANT', 'UNIVERSITY_FUND', 'PRIVATE_COMPANY', 'NGO_INTERNATIONAL', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ResearchTransferDirection" AS ENUM ('CLINICAL_TO_RESEARCH', 'RESEARCH_TO_CLINICAL');

-- CreateEnum
CREATE TYPE "ResearchTrialStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResearchFindingType" AS ENUM ('EXPERIMENTAL_RESULT', 'MILESTONE', 'THESIS_CHAPTER', 'PUBLICATION', 'ACADEMIC_MATERIAL');

-- CreateTable
CREATE TABLE "research_projects" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "research_line" TEXT,
    "type" "ResearchProjectType" NOT NULL,
    "status" "ResearchProjectStatus" NOT NULL DEFAULT 'FORMULATION',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "total_invested_funds" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "spent_funds" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "remaining_funds" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "consumed_materials_value" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_project_members" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "ResearchMemberRole" NOT NULL,
    "can_request_materials" BOOLEAN NOT NULL DEFAULT true,
    "can_record_trials" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_investors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id_or_code" TEXT,
    "investor_type" "ResearchInvestorType" NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_investments" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "investor_id" INTEGER NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "investment_date" TIMESTAMP(3) NOT NULL,
    "purpose_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_donations" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "investor_id" INTEGER NOT NULL,
    "received_by_id" INTEGER NOT NULL,
    "donation_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_donation_items" (
    "id" SERIAL NOT NULL,
    "donation_id" INTEGER NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lot_number" TEXT NOT NULL,
    "expiration_date" DATE,
    "estimated_unit_value" DECIMAL(18,4) NOT NULL,
    "stock_batch_id" BIGINT,
    "lab_reagent_unit_id" BIGINT,

    CONSTRAINT "research_donation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_stock_transfers" (
    "id" SERIAL NOT NULL,
    "source_unit_id" BIGINT NOT NULL,
    "target_unit_id" BIGINT,
    "project_id" INTEGER NOT NULL,
    "authorized_by_id" INTEGER NOT NULL,
    "transferred_uses" INTEGER NOT NULL,
    "direction" "ResearchTransferDirection" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_trials" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "executed_by_id" INTEGER NOT NULL,
    "trial_date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "status" "ResearchTrialStatus" NOT NULL DEFAULT 'OPEN',
    "total_samples_tested" INTEGER NOT NULL DEFAULT 0,
    "total_trial_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_reference_value" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_trials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_trial_consumptions" (
    "id" SERIAL NOT NULL,
    "trial_id" INTEGER NOT NULL,
    "lab_reagent_unit_id" BIGINT NOT NULL,
    "external_calibrator_unit_id" BIGINT,
    "sample_uses" INTEGER NOT NULL DEFAULT 0,
    "repeat_uses" INTEGER NOT NULL DEFAULT 0,
    "repeat_reason" "RepeatReason",
    "calibrator_uses" INTEGER NOT NULL DEFAULT 0,
    "calibrator_notes" TEXT,
    "control_uses" INTEGER NOT NULL DEFAULT 0,
    "waste_uses" INTEGER NOT NULL DEFAULT 0,
    "total_deducted_uses" INTEGER NOT NULL DEFAULT 0,
    "calculated_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "calculated_reference_value" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,

    CONSTRAINT "research_trial_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_findings" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "trial_id" INTEGER,
    "recorded_by_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "finding_type" "ResearchFindingType" NOT NULL,
    "summary" TEXT NOT NULL,
    "conclusion" TEXT,
    "attachment_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_projects_code_key" ON "research_projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "research_project_members_project_id_user_id_key" ON "research_project_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_investors_tax_id_or_code_key" ON "research_investors"("tax_id_or_code");

-- CreateIndex
CREATE UNIQUE INDEX "research_investments_code_key" ON "research_investments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "research_donations_code_key" ON "research_donations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "research_trials_code_key" ON "research_trials"("code");

-- CreateIndex
CREATE INDEX "lab_consumption_audit_logs_research_trial_id_idx" ON "lab_consumption_audit_logs"("research_trial_id");

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_research_project_id_fkey" FOREIGN KEY ("research_project_id") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reagent_units" ADD CONSTRAINT "lab_reagent_units_research_project_id_fkey" FOREIGN KEY ("research_project_id") REFERENCES "research_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_consumption_audit_logs" ADD CONSTRAINT "lab_consumption_audit_logs_research_trial_id_fkey" FOREIGN KEY ("research_trial_id") REFERENCES "research_trials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_project_members" ADD CONSTRAINT "research_project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_project_members" ADD CONSTRAINT "research_project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_investments" ADD CONSTRAINT "research_investments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_investments" ADD CONSTRAINT "research_investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "research_investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_donations" ADD CONSTRAINT "research_donations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_donations" ADD CONSTRAINT "research_donations_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "research_investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_donations" ADD CONSTRAINT "research_donations_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_donation_items" ADD CONSTRAINT "research_donation_items_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "research_donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_donation_items" ADD CONSTRAINT "research_donation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_donation_items" ADD CONSTRAINT "research_donation_items_stock_batch_id_fkey" FOREIGN KEY ("stock_batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_donation_items" ADD CONSTRAINT "research_donation_items_lab_reagent_unit_id_fkey" FOREIGN KEY ("lab_reagent_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_stock_transfers" ADD CONSTRAINT "research_stock_transfers_source_unit_id_fkey" FOREIGN KEY ("source_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_stock_transfers" ADD CONSTRAINT "research_stock_transfers_target_unit_id_fkey" FOREIGN KEY ("target_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_stock_transfers" ADD CONSTRAINT "research_stock_transfers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_stock_transfers" ADD CONSTRAINT "research_stock_transfers_authorized_by_id_fkey" FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_trials" ADD CONSTRAINT "research_trials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_trials" ADD CONSTRAINT "research_trials_executed_by_id_fkey" FOREIGN KEY ("executed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_trial_consumptions" ADD CONSTRAINT "research_trial_consumptions_trial_id_fkey" FOREIGN KEY ("trial_id") REFERENCES "research_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_trial_consumptions" ADD CONSTRAINT "research_trial_consumptions_lab_reagent_unit_id_fkey" FOREIGN KEY ("lab_reagent_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_trial_consumptions" ADD CONSTRAINT "research_trial_consumptions_external_calibrator_unit_id_fkey" FOREIGN KEY ("external_calibrator_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_trial_id_fkey" FOREIGN KEY ("trial_id") REFERENCES "research_trials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
