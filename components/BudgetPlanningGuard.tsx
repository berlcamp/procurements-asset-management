"use client";

import { hasBudgetPlanningAccess } from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSkeleton from "./LoadingSkeleton";

/** Restricts Budget Planning routes to SDS and budget officer only. */
export function BudgetPlanningGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppSelector((state) => state.user.user);
  const router = useRouter();

  useEffect(() => {
    if (user && !hasBudgetPlanningAccess(user.type)) {
      router.replace("/home");
    }
  }, [user, router]);

  if (!user) {
    return <LoadingSkeleton />;
  }

  if (!hasBudgetPlanningAccess(user.type)) {
    return <LoadingSkeleton />;
  }

  return <>{children}</>;
}
