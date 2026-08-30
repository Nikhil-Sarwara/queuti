import { getLastErrors, getUptime } from "@/lib/logging";
import { Card } from "@/components/ui";

/**
 * System status card: shows process uptime and the most
 * recent recorded errors (in-process ring buffer from lib/logging).
 * Server component — reads the Node-runtime error buffer directly.
 */
export default function SystemStatusCard({ fill }: { fill?: boolean }) {
  const uptime = getUptime();
  const errors = getLastErrors(5);

  const fmt = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Card className={fill ? "flex h-full flex-col" : undefined}>
      <h2 className="text-base font-bold text-text-primary">System status</h2>
      <p className="mt-1 text-xs text-text-secondary">
        Uptime <span className="font-semibold text-success">{fmt(uptime)}</span> ·{" "}
        last {errors.length} error{errors.length === 1 ? "" : "s"} recorded
      </p>
      {errors.length === 0 ? (
        <p className="mt-2 text-xs text-text-tertiary">No errors recorded this process lifetime.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {errors.map((e) => (
            <li key={e.requestId} className="rounded-lg border border-error/20 bg-error/5 px-3 py-2">
              <p className="truncate text-xs font-semibold text-error">
                {e.route || "unknown route"} — {e.message}
              </p>
              <p className="mt-0.5 text-[10px] text-text-tertiary">
                {e.ts} · req {e.requestId.slice(0, 8)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
