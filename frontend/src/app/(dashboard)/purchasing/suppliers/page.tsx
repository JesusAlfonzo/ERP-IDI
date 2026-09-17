"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import type { Supplier } from "@/types/purchasing";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Mail,
  Phone,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText,
} from "lucide-react";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal Nuevo Proveedor
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [rif, setRif] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [submittingSupplier, setSubmittingSupplier] = useState(false);

  // Modal Registrar Abono / Pago
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] =
    useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<
    "TRANSFERENCIA_USD" | "TRANSFERENCIA_BS" | "EFECTIVO_USD" | "PAGO_MOVIL"
  >("TRANSFERENCIA_USD");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Notificaciones
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await PurchasingClientService.getSuppliers();
      setSuppliers(data);
    } catch {
      // Interceptor global
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadSuppliers();
    };
    init();
  }, [router, loadSuppliers]);

  // Filtrado reactivo en front
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rif.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalGlobalDebt = suppliers.reduce(
    (acc, curr) => acc + Number(curr.totalDebtUsd || 0),
    0,
  );

  const handleCreateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !rif.trim()) {
      setFeedback({
        status: "error",
        message: "Razón social y RIF son obligatorios.",
      });
      return;
    }

    setSubmittingSupplier(true);
    try {
      await PurchasingClientService.createSupplier({
        name: name.trim(),
        rif: rif.trim().toUpperCase(),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        paymentTermsDays: Number(paymentTermsDays) || 30,
      });

      setFeedback({
        status: "success",
        message: "Proveedor registrado exitosamente.",
      });
      await loadSuppliers();

      setTimeout(() => {
        setIsSupplierModalOpen(false);
        setName("");
        setRif("");
        setContactName("");
        setContactEmail("");
        setContactPhone("");
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al crear el proveedor.",
      });
    } finally {
      setSubmittingSupplier(false);
    }
  };

  const handleRegisterPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment) return;
    setFeedback(null);

    if (
      !paymentAmount ||
      Number(paymentAmount) <= 0 ||
      !referenceNumber.trim()
    ) {
      setFeedback({
        status: "error",
        message: "Indique un monto y referencia bancaria válidos.",
      });
      return;
    }

    setSubmittingPayment(true);
    try {
      await PurchasingClientService.registerPayment({
        supplierId: selectedSupplierForPayment.id,
        amountUsd: Number(paymentAmount),
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
      });

      setFeedback({
        status: "success",
        message: "Abono registrado correctamente.",
      });
      await loadSuppliers();

      setTimeout(() => {
        setSelectedSupplierForPayment(null);
        setPaymentAmount("");
        setReferenceNumber("");
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar el pago.",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Directorio de Proveedores y Deuda
          </h1>
          <p className="text-xs text-slate-500">
            Gestión de casas matrices, plazos crediticios y control de pasivos
            en USD
          </p>
        </div>

        <button
          onClick={() => {
            setIsSupplierModalOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Proveedor
        </button>
      </div>

      {/* Banner de Deuda Global */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase font-semibold">
              Cuentas por Pagar Totales (Pasivo Institucional)
            </span>
            <div className="text-xl font-bold text-slate-800 font-mono">
              $
              {totalGlobalDebt.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por RIF o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Listado / Tarjetas de Proveedores */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          Cargando directorio comercial...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No se encontraron proveedores registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const debt = Number(supplier.totalDebtUsd || 0);
            return (
              <div
                key={supplier.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        {supplier.name}
                      </h3>
                      <span className="font-mono text-[11px] font-semibold text-blue-600">
                        {supplier.rif}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {supplier.paymentTermsDays || 30} días crédito
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    {supplier.contactName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Contacto: {supplier.contactName}</span>
                      </div>
                    )}
                    {supplier.contactEmail && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">
                          {supplier.contactEmail}
                        </span>
                      </div>
                    )}
                    {supplier.contactPhone && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{supplier.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Deuda Pendiente
                    </div>
                    <div
                      className={`text-base font-bold font-mono ${debt > 0 ? "text-red-600" : "text-emerald-600"}`}
                    >
                      $
                      {debt.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSupplierForPayment(supplier);
                      setPaymentAmount("");
                      setReferenceNumber("");
                      setFeedback(null);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Abonar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar Proveedor */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Registrar Proveedor
                </h3>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  feedback.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {feedback.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Razón Social / Empresa
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Bio-Diagnóstica C.A."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    RIF
                  </label>
                  <input
                    type="text"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="J-12345678-9"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Plazo Crédito (Días)
                  </label>
                  <input
                    type="number"
                    value={paymentTermsDays}
                    onChange={(e) =>
                      setPaymentTermsDays(Number(e.target.value))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Persona de Contacto
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nombre del asesor de ventas"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="ventas@proveedor.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0212-5550000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingSupplier}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {submittingSupplier && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submittingSupplier ? "Guardando..." : "Guardar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Abono */}
      {selectedSupplierForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Registrar Abono a Proveedor
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {selectedSupplierForPayment.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSupplierForPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  feedback.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {feedback.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleRegisterPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Monto del Abono (USD)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as typeof paymentMethod)
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TRANSFERENCIA_USD">
                    Transferencia Divisa (USD)
                  </option>
                  <option value="TRANSFERENCIA_BS">
                    Transferencia Bolívares (Tasa Oficial)
                  </option>
                  <option value="EFECTIVO_USD">Efectivo Divisas</option>
                  <option value="PAGO_MOVIL">Pago Móvil</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Referencia Bancaria / Comprobante
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="N° de confirmación bancaria o recibo"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSupplierForPayment(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {submittingPayment && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submittingPayment ? "Procesando..." : "Confirmar Abono"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
