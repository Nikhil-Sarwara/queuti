import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { OverviewStats } from "@/components/OverviewStats";
import { MarketIntel } from "@/components/MarketIntel";

export const dynamic = "force-dynamic";

/** Market intelligence (#18) — stats page with aggregation + recharts charts. */
export default async function StatsPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-engraved">
            🌍 Queuti — Market Intelligence
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Your job hunt, the way the market sees it · signed in as{" "}
            <strong>{session.email}</strong>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border-2 border-b-4 border-blood-dark/70 bg-gradient-to-b from-blood-light to-blood px-4 py-2 text-sm font-semibold text-paper-light shadow-bevel-sm transition active:translate-y-px active:border-b-2"
        >
          ← Back to dashboard
        </Link>
      </header>

      <OverviewStats />

      <MarketIntel />

      <p className="mt-8 text-center text-xs opacity-50">
        Aggregations run live on your applications — import more data to
        sharpen the picture.
      </p>
    </main>
  );
}