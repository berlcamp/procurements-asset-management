"use client";

import { formatUserTypeLabel } from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { Package } from "lucide-react";
import HeaderDropdown from "./HeaderDropdownMenu";
import HeaderQuickAccessMenu from "./HeaderQuickAccessMenu";
import { NotificationBell } from "./notifications/NotificationBell";
import { Badge } from "./ui/badge";
import { SidebarTrigger } from "./ui/sidebar";

export default function StickyHeader() {
  const user = useAppSelector((state) => state.user.user);

  return (
    <header className="fixed w-full top-0 z-40 bg-[#2e2e30] border-b border-[#424244] p-2 flex justify-start items-center gap-4">
      <SidebarTrigger />

      {/* Left section: Logo */}
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 shrink-0 text-white" aria-hidden />
        <div className="text-white font-semibold text-lg flex flex-col">
          <span className="md:hidden">PMS-AMS</span>
          <span className="hidden md:inline">
            Procurement and Assets Management System
          </span>
        </div>
      </div>

      <div className="flex-1"></div>

      {/* Quick access menu */}
      <HeaderQuickAccessMenu />

      {/* Notifications */}
      <NotificationBell />

      {/* User name and type */}
      {user?.name && (
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{user.name}</span>
          <Badge variant="secondary" className="text-xs">
            {user?.type ? formatUserTypeLabel(user.type) : ""}
          </Badge>
        </div>
      )}

      {/* Right section: Settings dropdown */}
      <HeaderDropdown />
    </header>
  );
}
