"use client";

import { ProcurementExecutionGuard } from "@/components/ProcurementExecutionGuard";

export default function ProcurementExecutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProcurementExecutionGuard>{children}</ProcurementExecutionGuard>;
}
