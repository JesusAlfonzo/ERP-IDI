"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BankAccountService } from "@/services/bank-account.service";
import type { DirectPayment } from "@/types/purchasing";
import { toast } from "@/utils/toast";
import {
  ArrowLeft,
  Printer,
  Building2,
  Calendar,
  CreditCard,
  FileCheck2,
  CheckCircle2,
  User,
  Loader2,
  Receipt,
  FileText,
} from "lucide-react";

export default function DirectPaymentDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const paymentId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [payment, setPayment] = useState<DirectPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!paymentId) return;

    startTransition(() => {
      void (async () => {
        try {
          const data = await BankAccountService.getDirectPaymentById(paymentId);
          setPayment(data);
        } catch (err) {
          console.error("Error al cargar comprobante de egreso:", err);
          toast.error("No se pudo cargar el detalle del egreso directo.");
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [paymentId]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs text-slate-500 font-medium">
          Cargando comprobante de egreso...
        </span>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Receipt className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Comprobante no encontrado
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          El egreso solicitado no existe o fue eliminado previamente del sistema.
        </p>
        <Link
          href="/admin/financial/payments"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Historial de Egresos
        </Link>
      </div>
    );
  }

  const pSymbol =
    payment.transactionCurrency === "VED"
      ? "Bs."
      : payment.transactionCurrency === "EUR"
        ? "€"
        : "$";
  const pAmount = Number(payment.amountPaid || 0);
  const pEquivUsd = Number(payment.equivalentAmountUsd || 0);
  const pRate = Number(payment.exchangeRate || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Barra Superior de Navegación y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          href="/admin/financial/payments"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Historial
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" /> Imprimir Comprobante
        </button>
      </div>

      {/* Tarjeta de Comprobante de Egreso (Voucher) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Cabecera Institucional del Comprobante */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
              Comprobante de Egreso Directo / Tesorería
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Instituto de Inmunología Clínica IDI
            </h1>
            <p className="text-xs text-slate-500">
              RIF: J-00000000-0 | Dirección Administrativa y Financiera
            </p>
          </div>

          <div className="text-left md:text-right space-y-1 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
            <span className="text-xs font-mono text-slate-400 block">
              Comprobante N°
            </span>
            <span className="text-lg font-black font-mono text-slate-800 block">
              {payment.referenceNumber
                ? `#${payment.referenceNumber}`
                : `#EGR-${String(payment.id).padStart(6, "0")}`}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Asentado / Liquidado
            </span>
          </div>
        </div>

        {/* Cuerpo del Comprobante */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Concepto y Beneficiario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Concepto del Desembolso
              </span>
              <p className="text-sm font-bold text-slate-900">{payment.concept}</p>
              {payment.notes && (
                <p className="text-xs text-slate-600 pt-1 border-t border-slate-200 font-sans">
                  {payment.notes}
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" /> Beneficiario / Razón Social
              </span>
              <p className="text-sm font-bold text-slate-900">{payment.beneficiary}</p>
              <p className="text-xs text-slate-500">
                Tipo de Operación: Egreso Directo Sin Orden Previa
              </p>
            </div>
          </div>

          {/* Información Financiera y Bancaria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cuenta Bancaria Origen */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Cuenta Bancaria Origen (Institucional)
              </span>
              {payment.sourceAccount ? (
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900">
                    {payment.sourceAccount.bankName}
                  </div>
                  <div className="font-mono text-slate-600">
                    {payment.sourceAccount.accountNumber || "Caja / Efectivo Institucional"}
                  </div>
                  {(payment.sourceAccount.holderName || payment.sourceAccount.holderId) && (
                    <div className="text-[11px] text-slate-500">
                      {payment.sourceAccount.holderName}{" "}
                      {payment.sourceAccount.holderId ? `(${payment.sourceAccount.holderId})` : ""}
                    </div>
                  )}
                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {payment.sourceAccount.type} ({payment.sourceAccount.currency})
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  Efectivo / Caja Chica institucional no bancarizada
                </div>
              )}
            </div>

            {/* Datos de Destino y Método */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-600" /> Método y Cuenta Destino
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Método:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {payment.method}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Cuenta / Pago Móvil Destino: </span>
                  <span className="font-mono text-slate-800 font-medium">
                    {payment.destinationAccount || "N/A (Entrega directa)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">N° Referencia Bancaria: </span>
                  <span className="font-mono font-bold text-slate-900">
                    {payment.referenceNumber || "S/R"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cuadro de Liquidación de Montos */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Liquidación del Desembolso
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <span className="text-xs text-slate-400 block">Monto Transacción</span>
                <span className="text-2xl font-black font-mono">
                  {pSymbol} {pAmount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Moneda: {payment.transactionCurrency}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">Tasa de Cambio Aplicada</span>
                <span className="text-xl font-bold font-mono text-purple-300">
                  {payment.transactionCurrency === "USD"
                    ? "1.00 USD"
                    : `${pRate.toFixed(2)} Bs./${payment.transactionCurrency === "EUR" ? "€" : "$"}`}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Referencia BCV / Cierre
                </span>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700">
                <span className="text-xs text-emerald-400 block font-semibold">Equivalente Total (USD)</span>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  $ {pEquivUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Valor contable oficial
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Adicional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Fecha del Desembolso:</span>
              <span className="font-semibold text-slate-900 font-mono">
                {payment.paymentDate
                  ? new Date(payment.paymentDate).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <User className="w-4 h-4 text-slate-400" />
              <span>Registrado por:</span>
              <span className="font-semibold text-slate-900">
                {payment.registeredBy?.fullName || "Administrador del Sistema"}
              </span>
            </div>
          </div>

          {/* Sección de Firmas de Autorización */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" /> Firmas de Autorización y Aprobación
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              {/* Revisado por */}
              <div className="border border-slate-200 rounded-xl p-4 text-center space-y-3 bg-white">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Revisado Por
                </span>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-center justify-center">
                  {payment.reviewedBy ? (
                    <span className="font-medium text-xs text-slate-800">
                      {payment.reviewedBy}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">
                      Firma / Sello
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  {payment.reviewedBy || "Control Previo / Administración"}
                </div>
              </div>

              {/* Autorizado por */}
              <div className="border border-slate-200 rounded-xl p-4 text-center space-y-3 bg-white">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Autorizado Por
                </span>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-center justify-center">
                  {payment.authorizedBy ? (
                    <span className="font-medium text-xs text-slate-800">
                      {payment.authorizedBy}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">
                      Firma / Sello
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  {payment.authorizedBy || "Gerencia de Operaciones"}
                </div>
              </div>

              {/* Aprobado por */}
              <div className="border border-slate-200 rounded-xl p-4 text-center space-y-3 bg-white">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Aprobado Por
                </span>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-center justify-center">
                  {payment.approvedBy ? (
                    <span className="font-medium text-xs text-slate-800">
                      {payment.approvedBy}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">
                      Firma / Sello
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  {payment.approvedBy || "Dirección Instituto IDI"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del Comprobante */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Sistema Integrado ERP-IDI · Módulo de Tesorería</span>
          <span className="font-mono">
            Generado: {new Date().toLocaleDateString("es-VE")}
          </span>
        </div>
      </div>
    </div>
  );
}
