/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Notification Dropdown Component
 * Displays list of notifications
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationDropdownProps {
  userId?: number;
  onClose?: () => void;
}

export function NotificationDropdown({}: NotificationDropdownProps) {
  return (
    <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg animate-in fade-in-0 duration-150">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="h-96">
          <div className="p-4 text-center text-muted-foreground">
            No notifications
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
