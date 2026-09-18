"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import type { SupplierDebt, SupplierStatement } from "@/types/purchasing";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  PlusCircle,
  RefreshCw,
  X,
} from "lucide-react";

const PAYMENT_METHODS = [
  ["TRANSFERENCIA_USD", "Transferencia USD"],
  ["TRANSFERENCIA_BS", "Transferencia Bs."],
  ["PAGO_MOVIL", "Pago móvil"],
  ["EFECTIVO_USD", "Efectivo USD"],
] as const;

export default function SupplierDebtsPage() {
  const router = useRouter();
  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDebt | null>(
    null,
  );
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [paymentSupplier, setPaymentSupplier] = useState<SupplierDebt | null>(
    null,
  );
  const [amountUsd, setAmountUsd] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number][0]>("TRANSFERENCIA_USD");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      setDebts(await PurchasingClientService.getSupplierDebts());
    } catch (error) {
      setFeedback({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los saldos",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const init = async () => {
      await loadDebts();
    };
    void init();
  }, [loadDebts, router]);

  const openStatement = async (supplier: SupplierDebt) => {
    setSelectedSupplier(supplier);
    try {
      setStatement(
        await PurchasingClientService.getSupplierStatement(supplier.id),
      );
    } catch (error) {
      setFeedback({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el estado de cuenta",
      });
    }
  };

  const handlePayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentSupplier || !amountUsd || Number(amountUsd) <= 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await PurchasingClientService.registerPayment({
        supplierId: paymentSupplier.id,
        amountUsd: Number(amountUsd),
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        paymentDate,
        notes: notes.trim() || undefined,
      });
      setFeedback({
        status: "success",
        message: "Pago registrado y saldo actualizado.",
      });
      setPaymentSupplier(null);
      setAmountUsd("");
      setReferenceNumber("");
      setNotes("");
      await loadDebts();
    } catch (error) {
      setFeedback({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el pago",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balanceUsd, 0);
  const pendingSuppliers = debts.filter(
    (debt) => debt.balanceUsd > 0.009,
  ).length;
  const totalPaid = debts.reduce(
    (sum, debt) => sum + debt.totalPaidThisMonthUsd,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Banknote className="h-6 w-6 text-emerald-600" />
            Cuentas por Pagar
          </h1>
          <p className="text-xs text-slate-500">
            Balances comerciales y deuda consolidada de proveedores
          </p>
        </div>
        <button
          onClick={() => void loadDebts()}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600"
          title="Actualizar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${feedback.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          <AlertCircle className="h-4 w-4" />
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-red-100 bg-red-50 p-5">
          <span className="text-xs font-semibold uppercase text-red-700">
            Deuda acumulada
          </span>
          <div className="mt-2 text-2xl font-bold text-red-800">
            ${totalDebt.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <span className="text-xs font-semibold uppercase text-amber-700">
            Proveedores con saldo
          </span>
          <div className="mt-2 text-2xl font-bold text-amber-800">
            {pendingSuppliers}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <span className="text-xs font-semibold uppercase text-emerald-700">
            Total pagado registrado
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-800">
            ${totalPaid.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3 text-right">Comprado</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Cargando cuentas...
                  </td>
                </tr>
              ) : (
                debts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {debt.name}
                      </div>
                      <div className="ml-6 font-mono text-[10px] text-slate-500">
                        {debt.rifOrId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      ${debt.totalPurchasedUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      ${debt.totalPaidUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      ${debt.balanceUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {debt.status === "SOLVENTE" ? (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Solvente
                        </span>
                      ) : (
                        <span className="rounded border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">
                          Con deuda
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setPaymentSupplier(debt)}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 font-semibold text-white"
                        >
                          <PlusCircle className="h-3 w-3" />
                          Registrar pago
                        </button>
                        <button
                          onClick={() => void openStatement(debt)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1.5 font-semibold text-slate-700"
                        >
                          <Eye className="h-3 w-3" />
                          Estado
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form
            onSubmit={handlePayment}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-bold text-slate-800">
                Registrar pago a {paymentSupplier.name}
              </h2>
              <button
                type="button"
                onClick={() => setPaymentSupplier(null)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Saldo actual:{" "}
              <strong className="text-base text-red-700">
                ${paymentSupplier.balanceUsd.toFixed(2)}
              </strong>
            </p>
            <label className="block text-xs font-semibold text-slate-800">
              Monto USD
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={amountUsd}
                onChange={(e) =>
                  setAmountUsd(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-800">
              Método
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as typeof paymentMethod)
                }
                className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {PAYMENT_METHODS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-800">
                Referencia
                <input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="text-xs font-semibold text-slate-800">
                Fecha
                <input
                  required
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-800">
              Notas / comprobante
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setPaymentSupplier(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar pago
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedSupplier && statement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-bold text-slate-800">
                Estado de cuenta: {statement.supplier.name}
              </h2>
              <button
                onClick={() => {
                  setSelectedSupplier(null);
                  setStatement(null);
                }}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">
                <span className="font-semibold text-slate-700">Comprado</span>
                <strong className="block text-lg font-bold text-slate-900">
                  ${statement.totalPurchasedUsd.toFixed(2)}
                </strong>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                <span className="font-semibold">Pagado</span>
                <strong className="block text-lg font-bold text-emerald-800">
                  ${statement.totalPaidUsd.toFixed(2)}
                </strong>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                <span className="font-semibold">Saldo pendiente</span>
                <strong className="block text-lg font-bold text-red-800">
                  ${statement.balanceUsd.toFixed(2)}
                </strong>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {statement.orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm"
                >
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Orden {order.orderNumber}</span>
                    <span className="text-red-700">
                      ${order.balanceUsd.toFixed(2)} pendiente
                    </span>
                  </div>
                  <div className="mt-2 text-slate-700">
                    Compra ${order.totalUsd.toFixed(2)} · Pagado $
                    {order.paidUsd.toFixed(2)}
                  </div>
                  {order.payments?.map((payment) => (
                    <div
                      key={payment.id}
                      className="mt-2 border-t border-slate-100 pt-2 text-slate-700"
                    >
                      Pago {new Date(payment.paymentDate).toLocaleDateString()}{" "}
                      · {payment.paymentMethod} ·{" "}
                      {Number(payment.amount).toFixed(2)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
