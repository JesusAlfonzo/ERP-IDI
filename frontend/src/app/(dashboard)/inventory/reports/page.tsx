"use client";

import React from "react";
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder";

export default function InventoryReportsPage() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <CustomReportBuilder />
    </div>
  );
}
