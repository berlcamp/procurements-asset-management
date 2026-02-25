"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClipboardList, Grid3X3, ListCheck } from "lucide-react";
import Link from "next/link";

const quickAccessSections = [
  {
    title: "Procurement Planning",
    items: [
      { title: "PPMP", url: "/planning/ppmp", icon: ListCheck },
      {
        title: "Purchase Request",
        url: "/planning/purchaserequests",
        icon: ClipboardList,
      },
    ],
  },
];

export default function HeaderQuickAccessMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-white/10 rounded-md transition-colors"
        >
          <Grid3X3 className="h-5 w-5 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl shadow-xl border border-border p-1.5"
      >
        {quickAccessSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 && <DropdownMenuSeparator className="my-1" />}
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-3 py-1.5">
              {section.title}
            </DropdownMenuLabel>
            {section.items.map((item) => (
              <DropdownMenuItem key={item.title} asChild>
                <Link
                  href={item.url}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{item.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
