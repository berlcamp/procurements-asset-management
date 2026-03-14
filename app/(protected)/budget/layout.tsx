"use client";

import { BudgetPlanningGuard } from "@/components/BudgetPlanningGuard";

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BudgetPlanningGuard>{children}</BudgetPlanningGuard>;
}
