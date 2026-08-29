import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { users } from "@/lib/models";
import { Card, Button } from "@/components/ui";
import { ObjectId } from "mongodb";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ResendVerificationButton } from "./ResendVerificationButton";

export const dynamic = "force-dynamic";

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
    <div className="mx-auto max-w-2xl py-8">
      {/* ── Header ── */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            ⚙️ Account
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Signed in as <strong className="text-text-primary">{session.email}</strong>
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">← Back to tracker</Button>
        </Link>
      </header>

      <div className="space-y-4">
        {/* Verification banner */}
        {!user?.verified && (
          <Card className="border-accent/20 bg-accent/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-text-primary">
                  Verify your email
                </h2>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Confirm <strong>{user?.email ?? session.email}</strong> to
                  unlock the full experience.
                </p>
              </div>
              <ResendVerificationButton />
            </div>
          </Card>
        )}

        {/* Profile */}
        <Card>
          <h2 className="text-lg font-bold text-text-primary">Profile</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Email
              </dt>
              <dd className="mt-1 text-text-primary">{user?.email ?? session.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Member since
              </dt>
              <dd className="mt-1 text-text-primary">{joined}</dd>
            </div>
          </dl>
        </Card>

        {/* Change password */}
        <Card>
          <h2 className="text-lg font-bold text-text-primary">Change password</h2>
          <p className="mt-1 text-sm text-text-secondary">
            You&apos;ll need to confirm your current password.
          </p>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
