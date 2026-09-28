"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BankAccountService } from "@/services/bank-account.service";
import type { DirectPayment } from "@/types/purchasing";
import { toast } from "@/utils/toast";
import {
  PrintableDocument,
  DocumentHeader,
  DocumentMetadataGrid,
  DocumentSignatures,
  DocumentFooter,
  PrintActionButton,
} from "@/components/common/PrintableDocument";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Receipt,
  Coins,
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
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

  const voucherCode = `VOUCHER-${String(payment.id).padStart(6, "0")}`;
  const formattedPaymentDate = payment.paymentDate
    ? new Date(payment.paymentDate).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : payment.createdAt
      ? new Date(payment.createdAt).toLocaleDateString("es-VE")
      : "-";

  // Formato formal de la cuenta bancaria origen (20 dígitos si aplica)
  const formatAccountNumber = (accNum?: string | null) => {
    if (!accNum) return "Caja / Efectivo Institucional no bancarizada";
    const cleaned = accNum.replace(/\s+/g, "");
    if (cleaned.length === 20) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 10)}-${cleaned.slice(10)}`;
    }
    return accNum;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Barra Superior de Navegación y Acciones (Oculta al imprimir) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/financial/payments"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Historial
        </Link>

        <PrintActionButton label="Imprimir Comprobante" />
      </div>

      {/* DOCUMENTO IMPRIMIBLE FORMAL DE EGRESO (VOUCHER) */}
      <PrintableDocument>
        {/* Cabecera Institucional Formal */}
        <DocumentHeader
          title="COMPROBANTE DE EGRESO / PAGO DIRECTO"
          subtitle="Dirección Administrativa y Financiera · ERP-IDI"
          documentNumber={voucherCode}
          badge="TESORERÍA Y BANCOS"
          status={{
            label: "Asentado / Liquidado",
            className: "bg-emerald-50 text-emerald-800 border-emerald-300",
          }}
          date={formattedPaymentDate}
          institutionName="INMUNOLOGIA ASOCIACION CIVIL"
          rif="J-30710739-1"
        />

        {/* Metadatos Generales del Comprobante */}
        <DocumentMetadataGrid
          columns={4}
          items={[
            {
              label: "N° Comprobante Egreso",
              value: <span className="font-mono font-bold">{voucherCode}</span>,
            },
            {
              label: "Fecha Valor / Desembolso",
              value: formattedPaymentDate,
            },
            {
              label: "Beneficiario / Razón Social",
              value: (
                <span className="font-bold text-slate-900 print:text-black">
                  {payment.beneficiary}
                </span>
              ),
              colSpan: 2,
            },
            {
              label: "Concepto del Gasto",
              value: payment.concept,
              colSpan: 4,
            },
          ]}
        />

        {/* Desglose Bancario Institucional */}
        <div className="space-y-2 break-inside-avoid">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200 print:border-black">
            <Building2 className="w-4 h-4 text-blue-600 print:text-black" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider print:text-black">
              Desglose Bancario y Transaccional
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cuenta Origen Institucional (20 Dígitos) */}
            <div className="p-3.5 rounded-lg border border-slate-300 print:border-black bg-slate-50/50 print:bg-white space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-black block border-b border-slate-200 print:border-black pb-1">
                Cuenta Bancaria Origen (Institucional)
              </span>
              {payment.sourceAccount ? (
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 print:text-black">
                    {payment.sourceAccount.bankName}
                  </div>
                  <div className="font-mono font-semibold text-slate-800 print:text-black text-[11px]">
                    {formatAccountNumber(payment.sourceAccount.accountNumber)}
                  </div>
                  <div className="text-[11px] text-slate-600 print:text-slate-700">
                    Tipo: {payment.sourceAccount.type} &bull; Moneda: {payment.sourceAccount.currency}
                  </div>
                  {(payment.sourceAccount.holderName || payment.sourceAccount.holderId) && (
                    <div className="text-[10px] text-slate-500 print:text-slate-700">
                      Titular: {payment.sourceAccount.holderName}{" "}
                      {payment.sourceAccount.holderId ? `(${payment.sourceAccount.holderId})` : ""}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic print:text-black">
                  Caja Chica / Efectivo institucional no bancarizado
                </div>
              )}
            </div>

            {/* Cuenta Destino / Proveedor y Referencia */}
            <div className="p-3.5 rounded-lg border border-slate-300 print:border-black bg-slate-50/50 print:bg-white space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-black block border-b border-slate-200 print:border-black pb-1">
                Datos de Destino y Validación Bancaria
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 print:text-black">Método de Pago:</span>
                  <span className="font-bold text-slate-900 print:text-black uppercase">
                    {payment.method}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 print:text-black">N° Referencia Bancaria:</span>
                  <span className="font-mono font-bold text-slate-900 print:text-black">
                    {payment.referenceNumber || "S/R"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 print:text-black block text-[10px]">
                    Cuenta / Pago Móvil Destino:
                  </span>
                  <span className="font-mono font-medium text-slate-800 print:text-black text-[11px] break-all">
                    {payment.destinationAccount || "N/A (Desembolso directo en taquilla/efectivo)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desglose Financiero y Cuadro de Liquidación */}
        <div className="border border-slate-300 print:border-black rounded-lg p-4 bg-slate-50/50 print:bg-white break-inside-avoid space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 print:border-black">
            <Coins className="w-4 h-4 text-amber-600 print:text-black" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider print:text-black">
              Desglose Financiero y Contabilidad de Divisas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Monto en Moneda Original */}
            <div className="p-3 bg-white print:bg-transparent rounded border border-slate-200 print:border-black space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-black block">
                Monto en Moneda Original
              </span>
              <div className="text-xl font-black font-mono text-slate-900 print:text-black">
                {pSymbol} {pAmount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block font-mono">
                Moneda: {payment.transactionCurrency} ({pSymbol})
              </span>
            </div>

            {/* Tasa BCV Aplicada */}
            <div className="p-3 bg-white print:bg-transparent rounded border border-slate-200 print:border-black space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-black block">
                Tasa Oficial BCV Aplicada
              </span>
              <div className="text-xl font-bold font-mono text-slate-800 print:text-black">
                {payment.transactionCurrency === "USD"
                  ? "1.00 USD (Base)"
                  : `${pRate.toFixed(2)} Bs./${payment.transactionCurrency === "EUR" ? "€" : "$"}`}
              </div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                Tasa de cambio para conversión contable
              </span>
            </div>

            {/* Contravalor en USD */}
            <div className="p-3 bg-white print:bg-transparent rounded border border-slate-200 print:border-black space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 print:text-black block">
                Contravalor / Equivalente USD
              </span>
              <div className="text-xl font-black font-mono text-emerald-800 print:text-black">
                $ {pEquivUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                Valor contable oficial en tesorería
              </span>
            </div>
          </div>
        </div>

        {/* Sección de 3 Firmas Pre-llenadas */}
        <DocumentSignatures
          signatures={[
            {
              role: `Revisado por: ${payment.reviewedBy || ""}`.trim() || "Revisado por:",
              name: payment.reviewedBy || "Control Previo / Administración",
              department: "Administración y Contabilidad",
              stampText: "Firma y Sello",
            },
            {
              role: `Autorizado por: ${payment.authorizedBy || ""}`.trim() || "Autorizado por:",
              name: payment.authorizedBy || "Gerencia de Operaciones",
              department: "Gerencia Financiera",
              stampText: "Firma y Sello",
            },
            {
              role: `Aprobado por: ${payment.approvedBy || ""}`.trim() || "Aprobado por:",
              name: payment.approvedBy || "Dirección Instituto IDI",
              department: "Dirección Institucional",
              stampText: "Firma y Sello",
            },
          ]}
        />

        {/* Pie del Documento */}
        <DocumentFooter
          notes={payment.notes || "Este comprobante certifica la liquidación y desembolso de fondos para los fines institucionales descritos conforme a la normativa interna de control financiero."}
          institutionText="INMUNOLOGIA ASOCIACION CIVIL · RIF: J-30710739-1"
          systemSignature={`ERP-IDI v2.0 · Egreso ${voucherCode}`}
        />
      </PrintableDocument>
    </div>
  );
}
