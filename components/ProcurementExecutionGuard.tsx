"use client";

import { hasProcurementExecutionAccess } from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSkeleton from "./LoadingSkeleton";

/** Restricts Procurement Execution routes to budget/accounting/procurement/BAC/SDS only. */
export function ProcurementExecutionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppSelector((state) => state.user.user);
  const router = useRouter();

  useEffect(() => {
    if (user && !hasProcurementExecutionAccess(user.type)) {
      router.replace("/home");
    }
  }, [user, router]);

  if (!user) {
    return <LoadingSkeleton />;
  }

  if (!hasProcurementExecutionAccess(user.type)) {
    return <LoadingSkeleton />;
  }

  return <>{children}</>;
}
