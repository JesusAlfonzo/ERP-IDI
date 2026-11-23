-- CreateEnum
CREATE TYPE "PaymentOrderSourceType" AS ENUM ('PURCHASE_ORDER', 'SERVICE_ORDER');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('BORRADOR', 'PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA', 'PAGADA_PARCIALMENTE', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TreasuryPaymentStatus" AS ENUM ('BORRADOR', 'CONFIRMADO', 'ANULADO');

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" BIGSERIAL NOT NULL,
    "payment_order_number" TEXT NOT NULL,
    "source_type" "PaymentOrderSourceType" NOT NULL,
    "purchase_order_id" BIGINT,
    "service_order_id" BIGINT,
    "supplier_id" INTEGER,
    "beneficiary_name" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "debt_currency" TEXT NOT NULL DEFAULT 'USD',
    "total_debt_amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "remaining_balance" DECIMAL(18,2) NOT NULL,
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDIENTE_APROBACION',
    "notes" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "approval_notes" TEXT,
    "rejected_by_id" INTEGER,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_payments" (
    "id" BIGSERIAL NOT NULL,
    "payment_number" TEXT NOT NULL,
    "payment_order_id" BIGINT NOT NULL,
    "payment_date" DATE NOT NULL,
    "status" "TreasuryPaymentStatus" NOT NULL DEFAULT 'BORRADOR',
    "total_equivalent_in_debt_currency" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "confirmed_by_id" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_payment_lines" (
    "id" BIGSERIAL NOT NULL,
    "payment_id" BIGINT NOT NULL,
    "source_account_id" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "currency" TEXT NOT NULL,
    "amount_paid" DECIMAL(18,2) NOT NULL,
    "exchange_rate_id" BIGINT,
    "exchange_rate_value" DECIMAL(18,4) NOT NULL DEFAULT 1.0000,
    "equivalent_debt_amount" DECIMAL(18,2) NOT NULL,
    "reference_number" TEXT,
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_payment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account_movements" (
    "id" BIGSERIAL NOT NULL,
    "bank_account_id" INTEGER NOT NULL,
    "payment_line_id" BIGINT,
    "movement_date" DATE NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EGRESO',
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "exchange_rate_value" DECIMAL(18,4) NOT NULL DEFAULT 1.0000,
    "equivalent_debt_amount" DECIMAL(18,2) NOT NULL,
    "reference_number" TEXT,
    "description" TEXT NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_payment_order_number_key" ON "payment_orders"("payment_order_number");

-- CreateIndex
CREATE INDEX "payment_orders_status_idx" ON "payment_orders"("status");

-- CreateIndex
CREATE INDEX "payment_orders_source_type_idx" ON "payment_orders"("source_type");

-- CreateIndex
CREATE INDEX "payment_orders_purchase_order_id_idx" ON "payment_orders"("purchase_order_id");

-- CreateIndex
CREATE INDEX "payment_orders_service_order_id_idx" ON "payment_orders"("service_order_id");

-- CreateIndex
CREATE INDEX "payment_orders_supplier_id_idx" ON "payment_orders"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "treasury_payments_payment_number_key" ON "treasury_payments"("payment_number");

-- CreateIndex
CREATE INDEX "treasury_payments_payment_order_id_idx" ON "treasury_payments"("payment_order_id");

-- CreateIndex
CREATE INDEX "treasury_payments_status_idx" ON "treasury_payments"("status");

-- CreateIndex
CREATE INDEX "treasury_payments_payment_date_idx" ON "treasury_payments"("payment_date");

-- CreateIndex
CREATE INDEX "treasury_payment_lines_payment_id_idx" ON "treasury_payment_lines"("payment_id");

-- CreateIndex
CREATE INDEX "treasury_payment_lines_source_account_id_idx" ON "treasury_payment_lines"("source_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_movements_payment_line_id_key" ON "bank_account_movements"("payment_line_id");

-- CreateIndex
CREATE INDEX "bank_account_movements_bank_account_id_idx" ON "bank_account_movements"("bank_account_id");

-- CreateIndex
CREATE INDEX "bank_account_movements_movement_date_idx" ON "bank_account_movements"("movement_date");

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "direct_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_payments" ADD CONSTRAINT "treasury_payments_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_payments" ADD CONSTRAINT "treasury_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_payments" ADD CONSTRAINT "treasury_payments_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_payment_lines" ADD CONSTRAINT "treasury_payment_lines_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "treasury_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_payment_lines" ADD CONSTRAINT "treasury_payment_lines_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_payment_lines" ADD CONSTRAINT "treasury_payment_lines_exchange_rate_id_fkey" FOREIGN KEY ("exchange_rate_id") REFERENCES "currency_exchanges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_movements" ADD CONSTRAINT "bank_account_movements_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_movements" ADD CONSTRAINT "bank_account_movements_payment_line_id_fkey" FOREIGN KEY ("payment_line_id") REFERENCES "treasury_payment_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_movements" ADD CONSTRAINT "bank_account_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

