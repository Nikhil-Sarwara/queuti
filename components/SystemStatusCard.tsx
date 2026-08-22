import { getLastErrors, getUptime } from "@/lib/logging";
import { Card } from "@/components/ui";

/**
 * Admin-ish system status card (#40): shows process uptime and the most
 * recent recorded errors (in-process ring buffer from lib/logging).
 * Server component — reads the Node-runtime error buffer directly.
 */
export default function SystemStatusCard() {
  const uptime = getUptime();
  const errors = getLastErrors(5);

  const fmt = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Card material="paper" framed className="shadow-bevel-sm">
      <h2 className="font-display text-base font-bold text-ink">🩺 System status</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Uptime <span className="font-semibold text-moss-dark">{fmt(uptime)}</span> ·{" "}
        last {errors.length} error{errors.length === 1 ? "" : "s"} recorded
      </p>
      {errors.length === 0 ? (
        <p className="mt-2 text-xs text-ink-faint">No errors recorded this process lifetime.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {errors.map((e) => (
            <li key={e.requestId} className="rounded border border-blood/30 bg-blood/5 px-2 py-1">
              <p className="truncate text-[11px] font-semibold text-blood-dark">
                {e.route || "unknown route"} — {e.message}
              </p>
              <p className="text-[10px] text-ink-faint">
                {e.ts} · req {e.requestId.slice(0, 8)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}