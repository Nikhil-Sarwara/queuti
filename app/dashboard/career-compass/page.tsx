import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { MlPanel } from "@/components/MlPanel";

export const dynamic = "force-dynamic";

export default async function CareerCompassPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Career Compass
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          AI-powered role-fit scoring and recommendations
        </p>
      </div>

      <MlPanel />
    </div>
  );
}
