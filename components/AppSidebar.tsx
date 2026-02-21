"use client";

import {
  ArrowRightLeft,
  Award,
  Boxes,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DollarSign,
  FileSearch,
  FileText,
  Gavel,
  Home,
  Inbox,
  ListCheck,
  Loader2,
  Package,
  PackageSearch,
  School,
  Trash2,
  Truck,
  User,
  UserCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import { useEffect, useState } from "react";

export function AppSidebar() {
  const pathname = usePathname();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  const isOnOrganizationPage =
    pathname?.startsWith("/organization/schools") ||
    pathname?.startsWith("/organization/offices");

  const [isOrganizationOpen, setIsOrganizationOpen] = useState(
    isOnOrganizationPage || false,
  );

  useEffect(() => {
    setLoadingPath(null);
  }, [pathname]);

  useEffect(() => {
    if (isOnOrganizationPage && !isOrganizationOpen) {
      setIsOrganizationOpen(true);
    }
  }, [isOnOrganizationPage, isOrganizationOpen]);

  const handleLinkClick = (url: string) => {
    if (pathname === url) return;
    NProgress.start();
    setLoadingPath(url);
  };

  const navItems = [{ title: "Home", url: "/home", icon: Home }];

  const planningItems = [
    {
      title: "PPMP Submissions",
      url: "/planning/ppmp-submissions",
      icon: Inbox,
    },
    { title: "APP", url: "/planning/app", icon: FileText },
  ];

  const budgetItems = [
    { title: "LASA (Budget Visibility)", url: "/budget/lasa", icon: ListCheck },
    {
      title: "Budget Allocations",
      url: "/budget/budget-allocations",
      icon: DollarSign,
    },
  ];

  const procurementExecutionItems = [
    {
      title: "Purchase Requests (PR)",
      url: "/procurement-execution/purchase-requests",
      icon: ClipboardList,
    },
    {
      title: "Pre-Procurement",
      url: "/procurement-execution/pre-procurement",
      icon: FileSearch,
    },
    {
      title: "RFQ / Bidding",
      url: "/procurement-execution/rfq-bidding",
      icon: Gavel,
    },
    {
      title: "Bid Evaluation",
      url: "/procurement-execution/bid-evaluation",
      icon: ListCheck,
    },
    {
      title: "Notice of Award",
      url: "/procurement-execution/notice-of-award",
      icon: Award,
    },
    {
      title: "Purchase Orders",
      url: "/procurement-execution/purchase-orders",
      icon: Package,
    },
  ];

  const deliveryInspectionItems = [
    {
      title: "Deliveries",
      url: "/delivery-inspection/deliveries",
      icon: Truck,
    },
    {
      title: "Inspection & Acceptance (IAR)",
      url: "/delivery-inspection/inspection-acceptance",
      icon: ClipboardCheck,
    },
    {
      title: "Backorders / Delays",
      url: "/delivery-inspection/backorders-delays",
      icon: Clock,
    },
  ];

  const assetInventoryItems = [
    {
      title: "Asset Registry",
      url: "/asset-inventory/asset-registry",
      icon: PackageSearch,
    },
    {
      title: "Consumable Inventory",
      url: "/asset-inventory/consumable-inventory",
      icon: Boxes,
    },
    {
      title: "Custodian Assignments",
      url: "/asset-inventory/custodian-assignments",
      icon: UserCheck,
    },
    {
      title: "Transfers",
      url: "/asset-inventory/transfers",
      icon: ArrowRightLeft,
    },
    { title: "Disposal", url: "/asset-inventory/disposal", icon: Trash2 },
  ];

  const settingItems = [
    { title: "User Accounts", url: "/staff", icon: User },
    { title: "Schools", url: "/organization/schools", icon: School },
    { title: "Offices", url: "/organization/offices", icon: Building2 },
  ];

  const renderMenu = (
    items: { title: string; url: string; icon: React.ElementType }[],
  ) =>
    items.map((item) => {
      const isActive = pathname === item.url;
      const isLoading = loadingPath === item.url;

      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <Link
              href={item.url}
              onClick={() => handleLinkClick(item.url)}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ease-out",
                "hover:bg-accent/50 hover:shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isLoading && "opacity-60 cursor-wait",
                isActive
                  ? "bg-accent text-accent-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <div
                className={cn(
                  "flex items-center justify-center transition-transform duration-200",
                  isActive && "scale-110",
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-sm transition-colors duration-200",
                  isActive && "font-semibold",
                )}
              >
                {item.title}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar className="pt-13 border-r border-border/40">
      <SidebarContent className="bg-linear-to-b from-background via-background to-muted/20 backdrop-blur-sm">
        {/* Home */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderMenu(navItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Procurement Planning */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Procurement Planning
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderMenu(planningItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Budget Planning */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Budget Planning
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderMenu(budgetItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Procurement Execution */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Procurement Execution
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderMenu(procurementExecutionItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Delivery & Inspection */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Delivery & Inspection
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderMenu(deliveryInspectionItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Asset & Inventory */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Asset & Inventory
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderMenu(assetInventoryItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Settings
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderMenu(settingItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
