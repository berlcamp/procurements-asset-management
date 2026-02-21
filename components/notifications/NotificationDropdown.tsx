/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Notification Dropdown Component
 * Displays list of notifications from the database
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface NotificationDropdownProps {
  userId?: number;
  onClose?: () => void;
  onNotificationRead?: () => void;
}

export function NotificationDropdown({
  userId,
  onClose,
  onNotificationRead,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) {
      setNotifications((data as Notification[]) ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read_at) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
      onNotificationRead?.();
    }
    onClose?.();
  };

  return (
    <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg animate-in fade-in-0 duration-150">
      <CardContent className="p-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => handleNotificationClick(n)}
                  className={`block p-4 hover:bg-accent/50 transition-colors ${
                    !n.read_at ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${!n.read_at ? "font-medium" : ""}`}
                      >
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        {new Date(n.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
