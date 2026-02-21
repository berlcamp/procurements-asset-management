/**
 * Notification Bell Component
 * Shows notification icon with badge for unread count
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const user = useAppSelector((state) => state.user.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.system_user_id) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.system_user_id)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }, [user?.system_user_id]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchUnreadCount();
    }
  }, [isOpen, fetchUnreadCount]);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    },
    [],
  );

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") setIsOpen(false);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-white/10 rounded-md transition-colors"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            variant="destructive"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>
      {isOpen && user?.system_user_id && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          userId={user?.system_user_id}
          onNotificationRead={fetchUnreadCount}
        />
      )}
    </div>
  );
}
