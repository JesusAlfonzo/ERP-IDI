"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductService, ProductDetail } from "@/services/product.service";
import { CurrencyService, CurrencyItem } from "@/services/currency.service";
import {
  Package,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  //   ShieldAlert,
  //   Clock,
  Boxes,
  Thermometer,
  Barcode,
  Layers,
  //   FileSpreadsheet,
  Loader2,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!productId) return;

    startTransition(() => {
      void (async () => {
        try {
          const [pData, cData] = await Promise.all([
            ProductService.getProductById(productId),
            CurrencyService.getCurrencies(),
          ]);
          setProduct(pData);
          setCurrencies(cData);
        } catch (err) {
          console.error("Error cargando detalle del producto", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [productId]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">
          Cargando ficha técnica del insumo...
        </span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Package className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Producto no encontrado
        </h2>
        <button
          onClick={() => router.push("/inventory/products")}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
        </button>
      </div>
    );
  }

  // Cálculos financieros y de empaque
  const vesItem = currencies.find((c) => c.code === "VES");
  const vesRate = vesItem?.latestRate ? Number(vesItem.latestRate) : 0;

  const totalUnits = Number(product.totalStock ?? 0);
  const conversionFactor = Number(product.conversionFactor || 1);
  const totalPurchasePacks =
    conversionFactor > 1 ? (totalUnits / conversionFactor).toFixed(2) : null;
  const isBelowMinStock = totalUnits <= product.minStockAlert;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "EN_CUARENTENA":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DEFECTUOSO":
      case "VENCIDO":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "AGOTADO":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Botón Volver y Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/inventory/products")}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Regresar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {product.sku}
              </span>
              {product.isReagent && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Thermometer className="w-3 h-3" /> Reactivo Clínico
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {product.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/inventory/adjustments")}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            Ajustar Inventario
          </button>
        </div>
      </div>

      {/* Grid Resumen Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">
            Existencia Disponible
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalUnits}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">
              {product.baseUnit?.abbreviation}
            </span>
          </div>
          {totalPurchasePacks && (
            <span className="text-[11px] text-blue-600 font-medium block">
              Equivale a {totalPurchasePacks} {product.purchaseUnit?.name}s
            </span>
          )}
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">
            Alerta de Stock Mínimo
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {product.minStockAlert}{" "}
              <span className="text-xs font-sans text-slate-500 font-normal">
                {product.baseUnit?.abbreviation}
              </span>
            </span>
            {isBelowMinStock ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <AlertTriangle className="w-3 h-3" /> Bajo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Óptimo
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 block">
            Umbral de reposición
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">
            Factor de Conversión
          </span>
          <div className="text-sm font-semibold text-slate-800 pt-1">
            1 {product.purchaseUnit?.name ?? "Empaque"} ={" "}
            <span className="font-mono font-bold text-blue-600">
              {conversionFactor}
            </span>{" "}
            {product.baseUnit?.abbreviation}
          </div>
          <span className="text-[11px] text-slate-400 block">
            Relación de compra vs consumo
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">
            Lotes Activos Registrados
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {product.stockBatches?.length ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 block">
            Custodia total en almacenes
          </span>
        </div>
      </div>

      {/* Datos Generales y Parámetros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Ficha Técnica
          </h3>

          <div className="space-y-3 text-xs divide-y divide-slate-100">
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Categoría:</span>
              <span className="font-semibold text-slate-800">
                {product.category?.name ?? "Sin categoría"}
              </span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Marca Comercial:</span>
              <span className="font-semibold text-slate-800">
                {product.brand?.name ?? "Genérico"}
              </span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Código de Barras:</span>
              <span className="font-mono font-medium text-slate-800 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                {product.barcode ?? "No asignado"}
              </span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Régimen Fiscal:</span>
              <span className="font-semibold text-slate-800">
                {product.isTaxExempt ? "Exento de IVA" : "Gravable con IVA"}
              </span>
            </div>
            <div className="pt-2">
              <span className="text-slate-500 block mb-1">Descripción:</span>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {product.description || "Sin notas descriptivas adicionales."}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de Lotes del Producto */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                Lotes & Existencias Físicas
              </h3>
              <p className="text-[11px] text-slate-500">
                Ubicación, costos y caducidad individual
              </p>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {!product.stockBatches || product.stockBatches.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Boxes className="w-10 h-10 stroke-[1.5]" />
                <p className="text-xs">
                  No hay lotes ingresados para este insumo.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead>
                  <tr className="text-left font-semibold text-slate-500 pb-2">
                    <th className="pb-3">Lote</th>
                    <th className="pb-3">Ubicación</th>
                    <th className="pb-3 text-right">Cant. Actual</th>
                    <th className="pb-3 text-right">Costo ($ / Bs.)</th>
                    <th className="pb-3">Vencimiento</th>
                    <th className="pb-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.stockBatches.map((batch) => {
                    const costUsd = Number(batch.unitCostUsd);
                    const costVes =
                      vesRate > 0 ? (costUsd * vesRate).toFixed(2) : null;

                    return (
                      <tr
                        key={batch.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 font-mono font-bold text-slate-900">
                          {batch.lotNumber}
                        </td>
                        <td className="py-3 text-slate-600">
                          {batch.location?.name ?? "Almacén General"}
                          <span className="text-[10px] text-slate-400 block">
                            {batch.location?.type ?? "DEPOSITO"}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-semibold text-slate-800">
                          {Number(batch.currentQuantity)}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            / {Number(batch.initialQuantity)}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono">
                          <span className="font-semibold text-slate-900">
                            ${costUsd.toFixed(2)}
                          </span>
                          {costVes && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {costVes} Bs.
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {batch.expirationDate ? (
                            <span className="flex items-center gap-1 font-mono text-slate-700">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(
                                batch.expirationDate,
                              ).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">
                              No expira
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              batch.status,
                            )}`}
                          >
                            {batch.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
