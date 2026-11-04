-- CreateEnum
CREATE TYPE "FridgeAuditAdjustmentStatus" AS ENUM ('PENDING_ADJUSTMENT', 'ADJUSTED_AND_RECONCILED', 'FLAGGED_DISCREPANCY');

-- AlterEnum
ALTER TYPE "ConsumptionConcept" ADD VALUE 'PHYSICAL_AUDIT_ADJUSTMENT';

-- CreateTable
CREATE TABLE "fridge_physical_audits" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "performed_by_id" INTEGER NOT NULL,
    "audit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fridge_physical_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fridge_physical_audit_items" (
    "id" SERIAL NOT NULL,
    "audit_id" INTEGER NOT NULL,
    "lab_reagent_unit_id" BIGINT NOT NULL,
    "system_remaining_uses" INTEGER NOT NULL,
    "physical_remaining_uses" INTEGER NOT NULL,
    "variance" INTEGER NOT NULL,
    "adjustment_status" "FridgeAuditAdjustmentStatus" NOT NULL DEFAULT 'ADJUSTED_AND_RECONCILED',
    "notes" TEXT,

    CONSTRAINT "fridge_physical_audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fridge_physical_audits_code_key" ON "fridge_physical_audits"("code");

-- AddForeignKey
ALTER TABLE "fridge_physical_audits" ADD CONSTRAINT "fridge_physical_audits_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fridge_physical_audit_items" ADD CONSTRAINT "fridge_physical_audit_items_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "fridge_physical_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fridge_physical_audit_items" ADD CONSTRAINT "fridge_physical_audit_items_lab_reagent_unit_id_fkey" FOREIGN KEY ("lab_reagent_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
