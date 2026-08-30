"use client";

import { useState, useEffect } from "react";
import { Button, Badge } from "@/components/ui";

interface SessionInfo {
  _id: string;
  browser: string;
  os: string;
  device: string;
  ip: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function deviceIcon(device: string): string {
  switch (device) {
    case "desktop":
      return "🖥️";
    case "mobile":
      return "📱";
    case "tablet":
      return "📱";
    default:
      return "❓";
  }
}

export function SessionManager() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  async function fetchSessions() {
    try {
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId);
    setError(null);
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke session");
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sessions/revoke-all", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to revoke sessions");
      // Keep only the current session
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke sessions"
      );
    } finally {
      setRevokingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-lg bg-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-border" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-border" />
                <div className="h-3 w-32 rounded bg-border" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary">Active Sessions</h2>
        {otherSessions.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleRevokeAll}
            disabled={revokingAll}
          >
            {revokingAll ? "Revoking…" : "Log out everywhere else"}
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">
          No active sessions found.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {sessions.map((s) => (
            <div
              key={s._id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-elevated p-4"
            >
              <span className="text-xl">{deviceIcon(s.device)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {s.browser} · {s.os}
                  </span>
                  {s.isCurrent && (
                    <Badge tone="applied">Current session</Badge>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-text-secondary">
                  {s.ip !== "Unknown" ? s.ip : "Unknown IP"} · Last active{" "}
                  {timeAgo(s.lastActiveAt)}
                </div>
              </div>
              {!s.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(s._id)}
                  disabled={revoking === s._id}
                >
                  {revoking === s._id ? "Revoking…" : "Revoke"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
