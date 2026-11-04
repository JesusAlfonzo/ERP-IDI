-- CreateEnum
CREATE TYPE "LabItemType" AS ENUM ('REAGENT_KIT', 'STANDALONE_CALIBRATOR', 'CONTROL', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "StockOwnership" AS ENUM ('CLINICAL_ROUTINE', 'RESEARCH_PROJECT');

-- CreateEnum
CREATE TYPE "QuarantineInstanceType" AS ENUM ('RECEPTION_PURCHASING', 'INTERNAL_LAB');

-- CreateEnum
CREATE TYPE "QuarantineReason" AS ENUM ('COLD_CHAIN_BREAK', 'CALIBRATION_FAILURE', 'CONTAMINATION', 'DAMAGED_PACKAGING', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "QuarantineResolutionStatus" AS ENUM ('PENDING', 'RETURNED_TO_SUPPLIER', 'REINTEGRATED_TO_STOCK', 'WRITTEN_OFF_AS_LOSS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LabUnitStatus" ADD VALUE 'IN_TRANSIT_TO_LAB';
ALTER TYPE "LabUnitStatus" ADD VALUE 'INTERNAL_QUARANTINE';
ALTER TYPE "LabUnitStatus" ADD VALUE 'DISCARDED';

-- DropForeignKey
ALTER TABLE "batch_incidents" DROP CONSTRAINT "batch_incidents_batch_id_fkey";

-- AlterTable
ALTER TABLE "batch_incidents" ADD COLUMN     "affected_uses" INTEGER DEFAULT 0,
ADD COLUMN     "instance_type" "QuarantineInstanceType" NOT NULL DEFAULT 'RECEPTION_PURCHASING',
ADD COLUMN     "lab_area_id" INTEGER,
ADD COLUMN     "lab_reagent_unit_id" BIGINT,
ADD COLUMN     "quarantine_reason" "QuarantineReason",
ADD COLUMN     "resolution_status" "QuarantineResolutionStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "batch_id" DROP NOT NULL,
ALTER COLUMN "affected_quantity" SET DEFAULT 0.00;

-- AlterTable
ALTER TABLE "lab_reagent_units" ADD COLUMN     "consumed_uses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "initial_theoretical_uses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownership_type" "StockOwnership" NOT NULL DEFAULT 'CLINICAL_ROUTINE',
ADD COLUMN     "reference_cost_per_use" DECIMAL(18,4),
ADD COLUMN     "remaining_uses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "research_project_id" INTEGER,
ADD COLUMN     "unit_cost_per_use" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
ADD COLUMN     "yield_variance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "calibrators_per_run" INTEGER,
ADD COLUMN     "includes_calibrator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_lab_reagent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lab_item_type" "LabItemType",
ADD COLUMN     "theoretical_yield" INTEGER;

-- AlterTable
ALTER TABLE "stock_batches" ADD COLUMN     "ownership_type" "StockOwnership" NOT NULL DEFAULT 'CLINICAL_ROUTINE',
ADD COLUMN     "research_project_id" INTEGER;

-- CreateTable
CREATE TABLE "lab_areas" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lab_areas" (
    "user_id" INTEGER NOT NULL,
    "lab_area_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lab_areas_pkey" PRIMARY KEY ("user_id","lab_area_id")
);

-- CreateTable
CREATE TABLE "lab_exams" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_area_products" (
    "lab_area_id" INTEGER NOT NULL,
    "product_id" BIGINT NOT NULL,

    CONSTRAINT "lab_area_products_pkey" PRIMARY KEY ("lab_area_id","product_id")
);

-- CreateTable
CREATE TABLE "lab_exam_products" (
    "lab_exam_id" INTEGER NOT NULL,
    "product_id" BIGINT NOT NULL,

    CONSTRAINT "lab_exam_products_pkey" PRIMARY KEY ("lab_exam_id","product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_areas_code_key" ON "lab_areas"("code");

-- CreateIndex
CREATE UNIQUE INDEX "lab_areas_name_key" ON "lab_areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lab_exams_code_key" ON "lab_exams"("code");

-- AddForeignKey
ALTER TABLE "batch_incidents" ADD CONSTRAINT "batch_incidents_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_incidents" ADD CONSTRAINT "batch_incidents_lab_reagent_unit_id_fkey" FOREIGN KEY ("lab_reagent_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_incidents" ADD CONSTRAINT "batch_incidents_lab_area_id_fkey" FOREIGN KEY ("lab_area_id") REFERENCES "lab_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lab_areas" ADD CONSTRAINT "user_lab_areas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lab_areas" ADD CONSTRAINT "user_lab_areas_lab_area_id_fkey" FOREIGN KEY ("lab_area_id") REFERENCES "lab_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_exams" ADD CONSTRAINT "lab_exams_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "lab_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_area_products" ADD CONSTRAINT "lab_area_products_lab_area_id_fkey" FOREIGN KEY ("lab_area_id") REFERENCES "lab_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_area_products" ADD CONSTRAINT "lab_area_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_exam_products" ADD CONSTRAINT "lab_exam_products_lab_exam_id_fkey" FOREIGN KEY ("lab_exam_id") REFERENCES "lab_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_exam_products" ADD CONSTRAINT "lab_exam_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
