"use client";

import { hasStaffAccess } from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Restricts /staff to admin and super admin only. */
export function StaffGuard({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((state) => state.user.user);
  const router = useRouter();

  useEffect(() => {
    if (user && !hasStaffAccess(user.type)) {
      router.replace("/home");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  if (!hasStaffAccess(user.type)) {
    return null;
  }

  return <>{children}</>;
}
