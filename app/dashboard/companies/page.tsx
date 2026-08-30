import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { CompaniesPanel } from "@/components/CompaniesPanel";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Companies
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage companies and contacts
        </p>
      </div>

      <CompaniesPanel />
    </div>
  );
}
