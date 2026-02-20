/**
 * Notification Bell Component
 * Shows notification icon with badge for unread count
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hook";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const user = useAppSelector((state) => state.user.user);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    },
    []
  );

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClickOutside, handleEscape]);

  const unreadCount = 0;

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
        />
      )}
    </div>
  );
}
