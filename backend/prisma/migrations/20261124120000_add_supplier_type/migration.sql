-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('VENTAS', 'SERVICIOS', 'AMBOS');

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN "supplier_type" "SupplierType" NOT NULL DEFAULT 'VENTAS';

-- CreateIndex
CREATE INDEX "suppliers_supplier_type_idx" ON "suppliers"("supplier_type");
