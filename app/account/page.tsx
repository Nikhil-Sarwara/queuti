import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { users } from "@/lib/models";
import { Card } from "@/components/ui";
import { ObjectId } from "mongodb";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ResendVerificationButton } from "./ResendVerificationButton";

export const dynamic = "force-dynamic";

/** Protected account page — profile info + change password (#24). */
export default async function AccountPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  const col = await users();
  const user = await col.findOne(
    { _id: new ObjectId(session.userId) },
    { projection: { passwordHash: 0, resetTokenHash: 0, resetTokenExpiresAt: 0 } }
  );

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <main className="mx-auto max-w-xl px-4 py-8 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-engraved">
            ⚙️ Account
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Signed in as <strong>{session.email}</strong>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border-2 border-b-4 border-paper-dark bg-gradient-to-b from-paper-light to-paper px-4 py-2 text-sm font-semibold text-ink shadow-bevel-sm transition active:translate-y-px active:border-b-2"
        >
          ← Back to tracker
        </Link>
      </header>

      <div className="space-y-5">
        {!user?.verified && (
          <Card material="wood" framed className="border-brass/60 shadow-bevel-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-ink">
                  ⚠️ Verify your email
                </h2>
                <p className="mt-0.5 text-xs opacity-80">
                  Confirm <strong>{user?.email ?? session.email}</strong> to
                  unlock the full experience. A link was emailed to you —
                  didn&apos;t get it? Resend below.
                </p>
              </div>
              <ResendVerificationButton />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-display text-lg font-bold">Profile</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Email
              </dt>
              <dd className="mt-0.5">{user?.email ?? session.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Member since
              </dt>
              <dd className="mt-0.5">{joined}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold">Change password</h2>
          <p className="mt-1 text-xs opacity-70">
            You&apos;ll need to confirm your current password.
          </p>
          <ChangePasswordForm />
        </Card>
      </div>
    </main>
  );
}