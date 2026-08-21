import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { KanbanBoard } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

/** Protected dashboard — hosts the Kanban application tracker (task #5). */
export default async function DashboardPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-engraved">
            🗂️ Queuti — Application Tracker
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Signed in as <strong>{session.email}</strong> · drag-free board:
            use ← → to move applications between stages
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md border-2 border-b-4 border-blood-dark/70 bg-gradient-to-b from-blood-light to-blood px-4 py-2 text-sm font-semibold text-paper-light shadow-bevel-sm transition active:translate-y-px active:border-b-2"
          >
            Log out
          </button>
        </form>
      </header>

      <KanbanBoard />

      <p className="mt-8 text-center text-xs opacity-50">
        <Link href="/" className="hover:underline">← Back to home</Link> ·{" "}
        <Link href="/dashboard" className="hover:underline">Refresh view</Link>
      </p>
    </main>
  );
}