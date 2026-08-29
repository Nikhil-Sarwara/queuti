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

        {/* Row 2: Kanban / Table (2 cols) + Upcoming Interviews (1 col) */}
        <div className="lg:col-span-2">
          <KanbanBoard />
        </div>
        <div className="lg:col-span-1">
          <UpcomingInterviews />
        </div>

        {/* Row 3: Follow-up + Companies + ML */}
        <div className="lg:col-span-2">
          <FollowUpPanel />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <CompaniesPanel />
          <MlPanel />
        </div>

        {/* Row 4: Analytics + Market Intel + System Status */}
        <div className="lg:col-span-2">
          <AnalyticsDashboard />
        </div>
        <div className="lg:col-span-1">
          <SystemStatusCard />
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
