-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('BORRADOR', 'EN_APROBACION', 'APROBADA', 'RECHAZADA', 'ORDEN_PAGO', 'PAGADA', 'CANCELADA');

-- AlterTable
ALTER TABLE "direct_payments" ADD COLUMN     "approval_notes" TEXT,
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_user_id" INTEGER,
ADD COLUMN     "department_id" INTEGER,
ADD COLUMN     "estimated_date" TIMESTAMP(3),
ADD COLUMN     "payment_order_issued_at" TIMESTAMP(3),
ADD COLUMN     "payment_order_issued_by_id" INTEGER,
ADD COLUMN     "payment_order_notes" TEXT,
ADD COLUMN     "payment_order_number" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by_user_id" INTEGER,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "service_order_number" TEXT,
ADD COLUMN     "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PAGADA',
ADD COLUMN     "supplier_id" INTEGER,
ADD COLUMN     "support_url" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "direct_payments_service_order_number_key" ON "direct_payments"("service_order_number");

-- CreateIndex
CREATE UNIQUE INDEX "direct_payments_payment_order_number_key" ON "direct_payments"("payment_order_number");

-- CreateIndex
CREATE INDEX "direct_payments_status_idx" ON "direct_payments"("status");

-- AddForeignKey
ALTER TABLE "direct_payments" ADD CONSTRAINT "direct_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_payments" ADD CONSTRAINT "direct_payments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_payments" ADD CONSTRAINT "direct_payments_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_payments" ADD CONSTRAINT "direct_payments_rejected_by_user_id_fkey" FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_payments" ADD CONSTRAINT "direct_payments_payment_order_issued_by_id_fkey" FOREIGN KEY ("payment_order_issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

