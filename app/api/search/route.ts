import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications, companies, contacts } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { needsFollowUp } from "@/lib/followup";
import { escapeRegex } from "@/lib/validate";

export const dynamic = "force-dynamic";

const APP_LIMIT = 6;
const CRM_LIMIT = 4;
const MIN_QUERY = 2;

/**
 * GET /api/search?q=… — global palette search (#32): fuzzy-ish (regex,
 * case-insensitive) match across the user's applications (title, company,
 * notes, jd), companies (name, website, notes) and contacts (name, email,
 * notes). Bounded result sets so the palette stays snappy.
 */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < MIN_QUERY) {
    return NextResponse.json({ applications: [], companies: [], contacts: [] });
  }
  const rx = new RegExp(escapeRegex(q), "i");

  const uid = new ObjectId(session.userId);
  const [apps, cos, cts] = await Promise.all([
    applications()
      .then((c) =>
        c
          .find(
            {
              userId: uid,
              archivedAt: null,
              $or: [
                { title: rx },
                { companyName: rx },
                { notes: rx },
                { jd: rx },
              ],
            },
            {
              projection: {
                title: 1,
                companyName: 1,
                status: 1,
                dateApplied: 1,
                respondedAt: 1,
                updatedAt: 1,
              },
            }
          )
          .sort({ updatedAt: -1 })
          .limit(APP_LIMIT)
          .toArray()
      ),
    companies()
      .then((c) =>
        c
          .find(
            {
              userId: uid,
              $or: [{ name: rx }, { website: rx }, { notes: rx }],
            },
            { projection: { name: 1, website: 1, notes: 1 } }
          )
          .sort({ name: 1 })
          .limit(CRM_LIMIT)
          .toArray()
      ),
    contacts()
      .then((c) =>
        c
          .find(
            {
              userId: uid,
              $or: [{ name: rx }, { email: rx }, { notes: rx }],
            },
            { projection: { name: 1, email: 1, notes: 1 } }
          )
          .sort({ name: 1 })
          .limit(CRM_LIMIT)
          .toArray()
      ),
  ]);

  return NextResponse.json({
    applications: apps.map((a) => ({
      _id: a._id!.toHexString(),
      title: a.title,
      companyName: a.companyName || "",
      status: a.status,
      dateApplied: a.dateApplied.toISOString(),
      needsFollowUp: needsFollowUp(a),
    })),
    companies: cos.map((c) => ({
      _id: c._id!.toHexString(),
      name: c.name,
      website: c.website || "",
    })),
    contacts: cts.map((c) => ({
      _id: c._id!.toHexString(),
      name: c.name,
      email: c.email || "",
    })),
  });
}