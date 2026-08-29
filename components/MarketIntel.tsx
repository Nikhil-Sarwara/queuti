"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  salaryByRole: {
    label: string;
    avg: number;
    min: number;
    max: number;
    n: number;
  }[];
  trend: { label: string; count: number }[];
  offerRateBySource: {
    label: string;
    rate: number;
    offers: number;
    total: number;
  }[];
}

/**
 * Resolve theme tokens to concrete values for recharts (canvas props can't
 * read CSS vars directly). Re-reads on every render + forces a re-render
 * when data-theme changes, so charts swap palettes live.
 */
function useChartTheme() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const el = document.documentElement;
    const bump = () => setTick((n) => n + 1);
    const mo = new MutationObserver(bump);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  void tick;

  const cv = (name: string, fallback: string) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? `rgb(${v})` : fallback;
  };
  return {
    colors: [
      cv("--accent", "#5B5FC7"),
      cv("--accent-hover", "#4A4EB5"),
      cv("--success", "#2E7D32"),
      cv("--error", "#D32F2F"),
      cv("--info", "#0288D1"),
      cv("--warning", "#ED6C02"),
      cv("--text-secondary", "#6B6B6B"),
      cv("--text-primary", "#1A1A1A"),
    ],
    tick: { fontSize: 11, fill: cv("--text-secondary", "#6B6B6B") },
    grid: cv("--graph-grid", "#E8E8E6"),
    tipBg: cv("--graph-tip-bg", "#FAFAF8"),
    tipBorder: cv("--graph-tip-border", "#5B5FC7"),
    cursor: cv("--graph-cursor", "rgba(91,95,199,0.12)"),
  };
}

/** Market intelligence charts — recharts on the clean dashboard. */
export function MarketIntel() {
  const chart = useChartTheme();
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
      <Card className="text-sm text-error" role="alert">Could not load market intelligence: {error}</Card>
    );
  }
  if (!data) {
    return <Card className="text-sm text-text-secondary">Loading market intelligence…</Card>;
  }

  const empty =
    data.byCompany.length === 0 &&
    data.bySource.length === 0 &&
    data.byRole.length === 0 &&
    data.responseDaysBySource.length === 0 &&
    data.salaryByRole.length === 0 &&
    data.trend.length === 0 &&
    data.offerRateBySource.length === 0;

  if (empty) {
    return (
      <Card>
        <p className="text-sm italic text-text-tertiary">
          No data yet — import your applications (CSV or the form on the
          dashboard) and this page will show your market intelligence.
        </p>
      </Card>
    );
  }

  const fmtMoney = (v: number) =>
    v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      {/* by company */}
      <Card>
        <h3 className="text-sm font-bold text-text-primary">Applications by company</h3>
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byCompany} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={chart.tick} interval={0} angle={-28} textAnchor="end" height={64} />
              <YAxis tick={chart.tick} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: chart.cursor }}
                contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill={chart.colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* by source */}
      <Card>
        <h3 className="text-sm font-bold text-text-primary">Applications by source</h3>
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
                stroke={chart.tipBg}
              >
                {data.bySource.map((_, i) => (
                  <Cell key={i} fill={chart.colors[i % chart.colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-text-secondary">
          {data.bySource.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: chart.colors[i % chart.colors.length] }} />
              {s.label} · {s.count}
            </li>
          ))}
        </ul>
      </Card>

      {/* by role (title) */}
      <Card>
        <h3 className="text-sm font-bold text-text-primary">Applications by role</h3>
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byRole} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis type="number" tick={chart.tick} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={chart.tick} width={150} />
              <Tooltip
                cursor={{ fill: chart.cursor }}
                contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill={chart.colors[2]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* avg response days per source */}
      <Card>
        <h3 className="text-sm font-bold text-text-primary">Avg response days by source</h3>
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.responseDaysBySource} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="source" tick={chart.tick} interval={0} angle={-28} textAnchor="end" height={64} />
              <YAxis tick={chart.tick} />
              <Tooltip
                cursor={{ fill: chart.cursor }}
                contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`${value ?? 0} days`, "avg response"]}
              />
              <Bar dataKey="avgDays" fill={chart.colors[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* salary by role */}
      {data.salaryByRole.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-text-primary">Avg salary by role</h3>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salaryByRole} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                <XAxis type="number" tick={chart.tick} tickFormatter={(v: number) => fmtMoney(v)} />
                <YAxis type="category" dataKey="label" tick={chart.tick} width={130} />
                <Tooltip
                  cursor={{ fill: chart.cursor }}
                  contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [fmtMoney(Number(value)), "avg"]}
                  labelFormatter={(label) => `${label} (${data.salaryByRole.find((s) => s.label === label)?.n ?? 0} roles)`}
                />
                <Bar dataKey="avg" fill={chart.colors[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            {data.salaryByRole.slice(0, 4).map((s) => (
              <li key={s.label}>
                <span className="font-bold text-text-primary">{s.label}</span>: {fmtMoney(s.min)}–{fmtMoney(s.max)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* applications over time */}
      {data.trend.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-text-primary">Applications — last 12 weeks</h3>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="label" tick={chart.tick} interval={1} />
                <YAxis tick={chart.tick} allowDecimals={false} />
                <Tooltip
                  cursor={{ stroke: chart.tipBorder }}
                  contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${value}`, "applications"]}
                />
                <Line type="monotone" dataKey="count" stroke={chart.colors[0]} strokeWidth={2.5} dot={{ r: 3, fill: chart.colors[0] }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* offer rate by source */}
      {data.offerRateBySource.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-text-primary">Offer rate by source</h3>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.offerRateBySource} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="label" tick={chart.tick} interval={0} angle={-28} textAnchor="end" height={64} />
                <YAxis tick={chart.tick} unit="%" />
                <Tooltip
                  cursor={{ fill: chart.cursor }}
                  contentStyle={{ background: chart.tipBg, border: `1px solid ${chart.tipBorder}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${value}%`, "offer rate"]}
                  labelFormatter={(label) => {
                    const s = data.offerRateBySource.find((o) => o.label === label);
                    return s ? `${label} · ${s.offers}/${s.total} offers` : label;
                  }}
                />
                <Bar dataKey="rate" fill={chart.colors[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
