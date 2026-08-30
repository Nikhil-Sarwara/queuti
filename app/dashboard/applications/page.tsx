import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { KanbanBoard } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Applications
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kanban board and application management
        </p>
      </div>

      <KanbanBoard />
    </div>
  );
}
