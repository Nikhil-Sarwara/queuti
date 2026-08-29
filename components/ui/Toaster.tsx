"use client";

import { useEffect, useState } from "react";
import type { ToastMessage, ToastTone } from "@/lib/toast";

const EVENT = "queuti:toast";

const toneClasses: Record<ToastTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  error: "bg-error/10 text-error border-error/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
};

const icons: Record<ToastTone, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

/**
 * Global toast stack — slides in from top-right.
 * Clean card styling, no bevels. Mounted once in the root layout.
 */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastMessage>).detail;
      setToasts((prev) => [...prev.slice(-4), detail]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 4000);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-1 backdrop-blur-sm animate-[toastIn_300ms_ease-out] ${toneClasses[t.tone]}`}
        >
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold"
          >
            {icons[t.tone]}
          </span>
          <span className="min-w-0">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
