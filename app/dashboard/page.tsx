import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { KanbanBoard } from "@/components/KanbanBoard";
import { UpcomingInterviews } from "@/components/UpcomingInterviews";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { OverviewStats } from "@/components/OverviewStats";
import { FollowUpPanel } from "@/components/FollowUpPanel";
import { CompaniesPanel } from "@/components/CompaniesPanel";
import { MlPanel } from "@/components/MlPanel";
import SystemStatusCard from "@/components/SystemStatusCard";
import { Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <div className="py-8">
      {/* ── Header ── */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Queuti — Application Tracker
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Signed in as <strong className="text-text-primary">{session.email}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/account">
            <Button variant="secondary" size="sm">⚙️ Account</Button>
          </Link>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="danger" size="sm">Log out</Button>
          </form>
        </div>
      </header>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Row 1: Overview stats — full width */}
        <div className="lg:col-span-3">
          <OverviewStats />
        </div>

        {/* Row 2: Kanban (2 cols) + Upcoming Interviews (1 col) — stretch to fill row height */}
        <div className="lg:col-span-2 lg:row-span-2">
          <KanbanBoard />
        </div>
        <div className="flex flex-col lg:col-span-1 lg:row-span-2">
          <div className="flex-1"><UpcomingInterviews fill /></div>
        </div>

        {/* Row 3: Follow-ups (2 cols) + Companies & ML (1 col) */}
        <div className="flex flex-col lg:col-span-2">
          <div className="flex-1"><FollowUpPanel /></div>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="flex-1"><CompaniesPanel fill /></div>
          <div className="flex-1"><MlPanel fill /></div>
        </div>

        {/* Row 4: Analytics (2 cols) + System Status (1 col) */}
        <div className="lg:col-span-2">
          <AnalyticsDashboard />
        </div>
        <div className="flex flex-col lg:col-span-1">
          <div className="flex-1"><SystemStatusCard fill /></div>
        </div>
      </div>

      {/* ── Footer links ── */}
      <nav className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-text-tertiary">
        <Link href="/" className="hover:text-text-secondary">← Home</Link>
        <Link href="/stats" className="hover:text-text-secondary">🌍 Market intelligence</Link>
        <Link href="/dashboard" className="hover:text-text-secondary">Refresh view</Link>
      </nav>
    </div>
  );
}
