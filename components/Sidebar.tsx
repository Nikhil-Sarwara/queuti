"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarUpcoming } from "./SidebarUpcoming";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/applications", label: "Applications", icon: "📋" },
  { href: "/dashboard/career-compass", label: "Career Compass", icon: "🧭" },
  { href: "/dashboard/companies", label: "Companies", icon: "👥" },
  { href: "/dashboard/interviews", label: "Interviews", icon: "📅" },
] as const;

const COLLAPSED_KEY = "queuti_sidebar_collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      /* localStorage unavailable — default expanded */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const sidebarContent = (
    <nav className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-xl">🧭</span>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-text-primary">
            Queuti
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-border-subtle" />

      {/* Main nav */}
      <div className="flex-1 space-y-0.5 px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-elevated hover:text-text-primary"
              }`}
            >
              {/* Left border indicator for active state */}
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-accent" />
              )}
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm ${
                  active
                    ? "bg-accent/20"
                    : "bg-elevated/50 group-hover:bg-elevated"
                }`}
              >
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Upcoming interviews widget */}
      <SidebarUpcoming />

      {/* Divider */}
      <div className="mx-3 border-t border-border-subtle" />

      {/* Bottom links */}
      <div className="space-y-0.5 px-3 py-3">
        <Link
          href="/account"
          title={collapsed ? "Account" : undefined}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-elevated hover:text-text-primary"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-elevated/50 text-sm">
            ⚙️
          </span>
          {!collapsed && <span>Account</span>}
        </Link>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            title={collapsed ? "Log out" : undefined}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-error/10 hover:text-error"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-elevated/50 text-sm">
              🚪
            </span>
            {!collapsed && <span>Log out</span>}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mx-3 border-t border-border-subtle" />
      {!collapsed && (
        <div className="px-4 py-3 text-[10px] text-text-tertiary">
          Built with ❤️
        </div>
      )}

      {/* Collapse toggle (desktop only) */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="hidden lg:flex items-center justify-center border-t border-border-subtle py-2 text-text-tertiary transition-colors hover:bg-elevated hover:text-text-secondary"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span
          className={`text-xs transition-transform duration-200 ${
            collapsed ? "rotate-180" : ""
          }`}
        >
          ◀
        </span>
      </button>
    </nav>
  );

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface shadow-1 lg:hidden"
        aria-label="Open navigation"
      >
        <span className="text-lg">☰</span>
      </button>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] border-r border-border bg-surface transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-elevated hover:text-text-primary"
          aria-label="Close navigation"
        >
          ✕
        </button>
        {sidebarContent}
      </aside>

      {/* ── Desktop sidebar (sticky) ── */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out lg:flex ${
          collapsed ? "w-[68px]" : "w-[220px]"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
