/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('ALMACEN_GENERAL', 'LABORATORIO', 'OFICINA', 'DEPOSITO');

-- CreateEnum
CREATE TYPE "FridgeStatus" AS ENUM ('OPERATIVO', 'MANTENIMIENTO', 'DEFECTUOSO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('BORRADOR', 'ENVIADA', 'PARCIAL', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'PAGADO_PARCIAL', 'PAGADO', 'EXONERADO');

-- CreateEnum
CREATE TYPE "ReceptionStatus" AS ENUM ('PENDIENTE', 'PARCIAL', 'COMPLETO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFERENCIA_NACIONAL', 'PAGO_MOVIL', 'TRANSFERENCIA_INTERNACIONAL', 'EFECTIVO_USD', 'EFECTIVO_BS');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DISPONIBLE', 'EN_CUARENTENA', 'DEFECTUOSO', 'VENCIDO', 'AGOTADO');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA_COMPRA', 'TRASLADO_A_LABORATORIO', 'DESPACHO_SOLICITUD', 'AJUSTE_INVENTARIO', 'DESCARTE_MERMA');

-- CreateEnum
CREATE TYPE "LabUnitStatus" AS ENUM ('SELLADO', 'EN_USO', 'AGOTADO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "LabMovementType" AS ENUM ('CONSUMO_PRUEBAS', 'TRASLADO_NEVERA', 'DESCARTE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'DESPACHADA_PARCIAL', 'COMPLETADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FALLA_CONTROL_CALIDAD', 'CADENA_FRIO_ROTA', 'DANO_FISICO', 'CONTAMINACION_PRECIPITADO', 'VENCIMIENTO_PREMATURO', 'OTRO');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('ABIERTA', 'CONFIRMADA', 'DESCARTADA');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_exchanges" (
    "id" BIGSERIAL NOT NULL,
    "currency_id" INTEGER NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "effective_date" DATE NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "rif_or_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" BIGSERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "base_unit_id" INTEGER NOT NULL,
    "purchase_unit_id" INTEGER,
    "conversion_factor" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "is_tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "min_stock_alert" INTEGER NOT NULL DEFAULT 0,
    "is_reagent" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fridges" (
    "id" SERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_temp_celsius" DECIMAL(5,2),
    "status" "FridgeStatus" NOT NULL DEFAULT 'OPERATIVO',
    "description" TEXT,

    CONSTRAINT "fridges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "supplier_id" INTEGER,
    "currency_id" INTEGER NOT NULL,
    "exchange_rate" DECIMAL(18,4) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'BORRADOR',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reception_status" "ReceptionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "tax_total" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "quantity_ordered" DECIMAL(12,2) NOT NULL,
    "quantity_received" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantity_rejected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "base_quantity" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 16.00,
    "total_line" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payments" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "bank_name" TEXT,
    "reference_number" TEXT,
    "currency_id" INTEGER NOT NULL,
    "exchange_rate" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "receipt_image_url" TEXT,
    "registered_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_invoices" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "control_number" TEXT,
    "invoice_date" DATE NOT NULL,
    "file_url" TEXT,
    "tax_amount" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "location_id" INTEGER NOT NULL,
    "lot_number" TEXT NOT NULL,
    "current_quantity" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(18,4) NOT NULL,
    "expiration_date" DATE,
    "status" "BatchStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" BIGSERIAL NOT NULL,
    "reference_number" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "order_id" BIGINT,
    "origin_location_id" INTEGER,
    "destination_location_id" INTEGER,
    "notes" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement_items" (
    "id" BIGSERIAL NOT NULL,
    "stock_movement_id" BIGINT NOT NULL,
    "batch_id" BIGINT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(18,4),

    CONSTRAINT "stock_movement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_reagent_units" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "batch_id" BIGINT NOT NULL,
    "fridge_id" INTEGER,
    "unit_code" TEXT NOT NULL,
    "initial_volume" DECIMAL(12,2) NOT NULL,
    "current_volume" DECIMAL(12,2) NOT NULL,
    "status" "LabUnitStatus" NOT NULL DEFAULT 'SELLADO',
    "opened_at" TIMESTAMP(3),
    "opened_by_id" INTEGER,
    "expiration_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_reagent_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_stock_movements" (
    "id" BIGSERIAL NOT NULL,
    "lab_reagent_unit_id" BIGINT NOT NULL,
    "movement_type" "LabMovementType" NOT NULL,
    "amount_used" DECIMAL(12,2) NOT NULL,
    "from_fridge_id" INTEGER,
    "to_fridge_id" INTEGER,
    "reason" TEXT,
    "executed_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" BIGSERIAL NOT NULL,
    "request_number" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "weekly_token_cycle" TEXT NOT NULL,
    "dispatched_movement_id" BIGINT,
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_items" (
    "id" BIGSERIAL NOT NULL,
    "request_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity_requested" DECIMAL(12,2) NOT NULL,
    "quantity_approved" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_incidents" (
    "id" BIGSERIAL NOT NULL,
    "batch_id" BIGINT NOT NULL,
    "reported_by_id" INTEGER NOT NULL,
    "incident_type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_url" TEXT,
    "affected_quantity" DECIMAL(12,2) NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'ABIERTA',
    "resolved_by_id" INTEGER,
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "units_abbreviation_key" ON "units"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_rif_or_id_key" ON "suppliers"("rif_or_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "fridges_code_key" ON "fridges"("code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "stock_batches_product_id_lot_number_location_id_idx" ON "stock_batches"("product_id", "lot_number", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_reference_number_key" ON "stock_movements"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "lab_reagent_units_unit_code_key" ON "lab_reagent_units"("unit_code");

-- CreateIndex
CREATE UNIQUE INDEX "requests_request_number_key" ON "requests"("request_number");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_exchanges" ADD CONSTRAINT "currency_exchanges_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_exchanges" ADD CONSTRAINT "currency_exchanges_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_purchase_unit_id_fkey" FOREIGN KEY ("purchase_unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fridges" ADD CONSTRAINT "fridges_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_invoices" ADD CONSTRAINT "order_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_origin_location_id_fkey" FOREIGN KEY ("origin_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reagent_units" ADD CONSTRAINT "lab_reagent_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reagent_units" ADD CONSTRAINT "lab_reagent_units_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reagent_units" ADD CONSTRAINT "lab_reagent_units_fridge_id_fkey" FOREIGN KEY ("fridge_id") REFERENCES "fridges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reagent_units" ADD CONSTRAINT "lab_reagent_units_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_stock_movements" ADD CONSTRAINT "lab_stock_movements_lab_reagent_unit_id_fkey" FOREIGN KEY ("lab_reagent_unit_id") REFERENCES "lab_reagent_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_stock_movements" ADD CONSTRAINT "lab_stock_movements_from_fridge_id_fkey" FOREIGN KEY ("from_fridge_id") REFERENCES "fridges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_stock_movements" ADD CONSTRAINT "lab_stock_movements_to_fridge_id_fkey" FOREIGN KEY ("to_fridge_id") REFERENCES "fridges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_stock_movements" ADD CONSTRAINT "lab_stock_movements_executed_by_id_fkey" FOREIGN KEY ("executed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_dispatched_movement_id_fkey" FOREIGN KEY ("dispatched_movement_id") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_incidents" ADD CONSTRAINT "batch_incidents_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_incidents" ADD CONSTRAINT "batch_incidents_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_incidents" ADD CONSTRAINT "batch_incidents_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
