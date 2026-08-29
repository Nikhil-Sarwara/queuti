export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

const EVENT = "queuti:toast";

/** Fire a toast from anywhere (client-side). Rendered by <Toaster/>. */
export function toast(message: string, tone: ToastTone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastMessage>(EVENT, { detail: { id: Date.now() + Math.random(), message, tone } }));
}
