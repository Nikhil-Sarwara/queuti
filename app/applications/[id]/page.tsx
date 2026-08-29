import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { ApplicationDetail } from "@/components/ApplicationDetail";

export const dynamic = "force-dynamic";

/** Protected application detail page — status, stage timeline, notes, links (#15). */
export default async function ApplicationPage({
  params,
}: {
  params: { id: string };
}) {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className=" text-2xl font-bold">
          🗂️ Application Details
        </h1>
        <Link
          href="/dashboard"
          className="rounded-md border border-error bg-error px-4 py-2 text-sm font-semibold text-surface transition active:translate-y-px "
        >
          ← Back to dashboard
        </Link>
      </header>

      <ApplicationDetail id={params.id} sessionEmail={session.email} />
    </main>
  );
}