"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui";

interface LabelCount {
  label: string;
  count: number;
}
interface ResponseDays {
  source: string;
  avgDays: number;
  n: number;
}
interface MarketData {
  byCompany: LabelCount[];
  bySource: LabelCount[];
  byRole: LabelCount[];
  responseDaysBySource: ResponseDays[];
}

const PIE_COLORS = [
  "#c9a227",
  "#7a5434",
  "#5a6b3c",
  "#8e3b2e",
  "#6b4a2f",
  "#74864f",
  "#a8861f",
  "#2b2117",
];

const tickStyle = { fontSize: 11, fill: "#5c4d3a" };

/** Market intelligence charts (#18) — recharts on the skeuomorphic desk. */
export function MarketIntel() {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics/market", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { market: MarketData };
      })
      .then((d) => setData(d.market))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load market data"));
  }, []);

  if (error) {
    return (
      <Card className="text-sm text-blood-dark">⚠️ Could not load market intelligence: {error}</Card>
    );
  }
  if (!data) {
    return <Card className="text-sm opacity-70">🌍 Loading market intelligence…</Card>;
  }

  const empty =
    data.byCompany.length === 0 &&
    data.bySource.length === 0 &&
    data.byRole.length === 0 &&
    data.responseDaysBySource.length === 0;

  if (empty) {
    return (
      <Card material="paper" framed className="shadow-bevel-sm">
        <p className="text-sm italic opacity-60">
          No data yet — import your applications (CSV or the form on the
          dashboard) and this page will show your market intelligence.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      {/* by company */}
      <Card material="paper" framed className="shadow-bevel">
        <h3 className="font-display text-sm font-bold text-engraved">🏢 Applications by company</h3>
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byCompany} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd3bd" />
              <XAxis dataKey="label" tick={tickStyle} interval={0} angle={-28} textAnchor="end" height={64} />
              <YAxis tick={tickStyle} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(201,162,39,0.12)" }}
                contentStyle={{ background: "#f6f0e2", border: "1px solid #a8861f", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#c9a227" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* by source */}
      <Card material="paper" framed className="shadow-bevel">
        <h3 className="font-display text-sm font-bold text-engraved">🪧 Applications by source</h3>
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.bySource}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={2}
                stroke="#f6f0e2"
              >
                {data.bySource.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#f6f0e2", border: "1px solid #a8861f", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] opacity-75">
          {data.bySource.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              {s.label} · {s.count}
            </li>
          ))}
        </ul>
      </Card>

      {/* by role (title) */}
      <Card material="paper" framed className="shadow-bevel">
        <h3 className="font-display text-sm font-bold text-engraved">🧭 Applications by role</h3>
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byRole} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd3bd" />
              <XAxis type="number" tick={tickStyle} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={tickStyle} width={150} />
              <Tooltip
                cursor={{ fill: "rgba(90,107,60,0.12)" }}
                contentStyle={{ background: "#f6f0e2", border: "1px solid #a8861f", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#5a6b3c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* avg response days per source */}
      <Card material="paper" framed className="shadow-bevel">
        <h3 className="font-display text-sm font-bold text-engraved">⏱️ Avg response days by source</h3>
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.responseDaysBySource} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd3bd" />
              <XAxis dataKey="source" tick={tickStyle} interval={0} angle={-28} textAnchor="end" height={64} />
              <YAxis tick={tickStyle} />
              <Tooltip
                cursor={{ fill: "rgba(122,84,52,0.12)" }}
                contentStyle={{ background: "#f6f0e2", border: "1px solid #a8861f", borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`${value ?? 0} days`, "avg response"]}
              />
              <Bar dataKey="avgDays" fill="#7a5434" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}