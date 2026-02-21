"use client";

import { StaffGuard } from "@/components/StaffGuard";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffGuard>{children}</StaffGuard>;
}
