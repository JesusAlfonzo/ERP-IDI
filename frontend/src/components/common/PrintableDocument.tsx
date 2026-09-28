"use client";

import React, { useState } from "react";
import { Printer, ShieldCheck } from "lucide-react";

export interface PrintableDocumentProps {
  children: React.ReactNode;
  className?: string;
}

export function PrintableDocument({ children, className = "" }: PrintableDocumentProps) {
  return (
    <div
      className={`bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xs print:shadow-none print:border-none print:m-0 print:p-0 p-6 md:p-8 space-y-6 font-sans text-xs ${className}`}
    >
      {children}
    </div>
  );
}

export interface DocumentHeaderProps {
  title: string;
  subtitle?: string;
  documentNumber: string;
  badge?: string;
  status?: {
    label: string;
    className?: string;
  };
  date?: string;
  logoSrc?: string;
  institutionName?: string;
  rif?: string;
  additionalInfo?: React.ReactNode;
}

export function DocumentHeader({
  title,
  subtitle = "Instituto de Inmunología Clínica · ERP-IDI",
  documentNumber,
  badge,
  status,
  date,
  logoSrc = "/logo-iac.png",
  institutionName = "INMUNOLOGIA ASOCIACION CIVIL",
  rif = "J-30710739-1",
  additionalInfo,
}: DocumentHeaderProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="pb-5 border-b-2 border-slate-800 print:border-black break-inside-avoid">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Membrete institucional */}
        <div className="flex items-center gap-3.5">
          <div className="shrink-0 flex items-center justify-center">
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt="Logo IAC"
                className="h-14 w-auto max-w-32.5 object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="h-13 w-13 rounded-lg bg-slate-900 text-white flex flex-col items-center justify-center font-mono p-1 border border-slate-800 shadow-xs print:border-black">
                <span className="text-[11px] font-black tracking-widest leading-none">IAC</span>
                <span className="text-[7px] text-slate-300 font-bold uppercase tracking-tight mt-0.5">IDI</span>
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <h2 className="text-sm md:text-base font-black uppercase tracking-wide text-slate-900 print:text-black">
              {institutionName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-700 print:text-black">
              <span>RIF: {rif}</span>
              <span className="text-slate-300 print:text-slate-500">•</span>
              <span className="font-sans font-medium text-slate-600 print:text-slate-700 text-[11px]">
                {subtitle}
              </span>
            </div>
            {additionalInfo && (
              <div className="text-[10px] text-slate-500 print:text-slate-600 font-sans">
                {additionalInfo}
              </div>
            )}
          </div>
        </div>

        {/* Identificación del Documento */}
        <div className="text-left sm:text-right space-y-1 sm:self-start">
          <div className="flex sm:justify-end items-center gap-1.5 flex-wrap">
            {badge && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 print:border-black print:bg-white print:text-black">
                {badge}
              </span>
            )}
            {status && (
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border print:border-black print:bg-white print:text-black ${
                  status.className || "bg-slate-100 text-slate-800 border-slate-300"
                }`}
              >
                {status.label}
              </span>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider print:text-slate-700">
            {title}
          </div>

          <div className="text-lg md:text-xl font-black font-mono tracking-tight text-slate-900 print:text-black">
            {documentNumber}
          </div>

          {date && (
            <div className="text-[11px] font-mono text-slate-600 print:text-black">
              Fecha: <span className="font-semibold">{date}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface MetadataItem {
  label: string;
  value: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
}

export interface DocumentMetadataGridProps {
  items: MetadataItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function DocumentMetadataGrid({
  items,
  columns = 3,
  className = "",
}: DocumentMetadataGridProps) {
  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-3";

  return (
    <div
      className={`grid ${colClass} gap-2.5 p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg print:bg-white print:border-slate-300 text-xs break-inside-avoid ${className}`}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`space-y-0.5 ${
            item.colSpan === 2
              ? "sm:col-span-2"
              : item.colSpan === 3
                ? "sm:col-span-3"
                : item.colSpan === 4
                  ? "sm:col-span-2 md:col-span-4"
                  : ""
          }`}
        >
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-700">
            {item.label}
          </span>
          <div className="text-slate-900 print:text-black font-medium text-xs wrap-break-word">
            {item.value || "---"}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface SignatureBoxProps {
  role: string;
  name?: string | null;
  department?: string | null;
  stampText?: string;
  date?: string;
}

export interface DocumentSignaturesProps {
  signatures: SignatureBoxProps[];
  className?: string;
}

export function DocumentSignatures({
  signatures,
  className = "",
}: DocumentSignaturesProps) {
  return (
    <div className={`pt-4 border-t border-slate-200 print:border-black break-inside-avoid ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {signatures.map((sig, idx) => (
          <div
            key={idx}
            className="border border-slate-300 rounded-lg p-3 text-center flex flex-col justify-between bg-white print:border-black break-inside-avoid min-h-35"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 print:text-black border-b border-slate-100 pb-1">
              {sig.role}
            </div>

            {/* Espacio para firma manuscrita y sello institucional */}
            <div className="my-2 border-b-2 border-dashed border-slate-400 print:border-black h-16 flex flex-col items-center justify-end pb-1 text-[10px] text-slate-400 print:text-slate-500 italic">
              {sig.stampText || "Firma y Sello"}
            </div>

            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900 print:text-black truncate">
                {sig.name || "Nombre y Apellido"}
              </div>
              {sig.department && (
                <div className="text-[10px] text-slate-500 print:text-slate-700 truncate">
                  {sig.department}
                </div>
              )}
              {sig.date && (
                <div className="text-[9px] font-mono text-slate-400 print:text-slate-600">
                  Fecha: {sig.date}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface DocumentFooterProps {
  notes?: string;
  institutionText?: string;
  systemSignature?: string;
  className?: string;
}

export function DocumentFooter({
  notes,
  institutionText = "INMUNOLOGIA ASOCIACION CIVIL · RIF: J-30710739-1",
  systemSignature = "ERP-IDI v2.0 · Sistema de Gestión Hospitalaria e Inmunológica",
  className = "",
}: DocumentFooterProps) {
  return (
    <div className={`pt-3 border-t border-slate-200 print:border-black text-[10px] text-slate-500 print:text-black space-y-1.5 break-inside-avoid ${className}`}>
      {notes && (
        <div className="p-2 bg-slate-50 print:bg-white rounded border border-slate-200 print:border-slate-400 text-[11px]">
          <span className="font-bold text-slate-700 print:text-black">Observaciones: </span>
          <span className="text-slate-600 print:text-black">{notes}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[9px] font-mono">
        <span className="flex items-center gap-1 font-semibold">
          <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
          {institutionText}
        </span>
        <span className="text-slate-400 print:text-slate-600">
          {systemSignature} • {new Date().toLocaleDateString("es-VE")}
        </span>
      </div>
    </div>
  );
}

export interface PrintActionButtonProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function PrintActionButton({
  label = "Imprimir / Exportar PDF",
  onClick,
  className = "",
}: PrintActionButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`no-print print:hidden inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer ${className}`}
      title={label}
    >
      <Printer className="w-4 h-4 text-slate-500" />
      <span>{label}</span>
    </button>
  );
}
