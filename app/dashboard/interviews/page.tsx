import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { UpcomingInterviews } from "@/components/UpcomingInterviews";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const token = cookies().get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/login");

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Interviews & Screenings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          All your upcoming interviews and screening calls in one place.
          Add events from an application&apos;s detail page.
        </p>
      </div>

      <UpcomingInterviews />
    </div>
  );
}
