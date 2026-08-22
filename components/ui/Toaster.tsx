"use client";

import { useEffect, useState } from "react";
import type { ToastMessage, ToastTone } from "@/lib/toast";

const EVENT = "queuti:toast";

const tones: Record<ToastTone, string> = {
  success: "border-moss-dark/70 bg-gradient-to-b from-moss-light to-moss text-paper-light",
  error: "border-blood-dark/70 bg-gradient-to-b from-blood-light to-blood text-paper-light",
  info: "border-brass-dark/70 bg-gradient-to-b from-brass-light to-brass text-ink",
};

const icons: Record<ToastTone, string> = { success: "✅", error: "⚠️", info: "💡" };

/**
 * Global toast stack (bottom-right, beveled leather desk lanyard style).
 * Mounted once in the root layout; any code can fire toasts via lib/toast.
 */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastMessage>).detail;
      setToasts((prev) => [...prev.slice(-3), detail]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 3800);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,340px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2 rounded-md border-2 border-b-4 px-3 py-2 text-sm font-semibold shadow-bevel-lg animate-[queutiToastIn_.25s_ease-out] ${tones[t.tone]}`}
        >
          <span aria-hidden>{icons[t.tone]}</span>
          <span className="min-w-0">{t.message}</span>
        </div>
      ))}
    </div>
  );
}