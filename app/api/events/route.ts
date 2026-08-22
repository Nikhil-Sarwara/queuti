import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { events } from "@/lib/models";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UPCOMING_TYPES = ["interview", "screening"];
const HORIZON_DAYS = 14;

/**
 * GET /api/events — upcoming interview/screening events in the next 14 days,
 * joined with their application (title, company, status), sorted by date.
 * Powers the dashboard "upcoming interviews" panel (#16).
 */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const userId = new ObjectId(session.userId);

  const col = await events();
  const docs = await col
    .aggregate([
      {
        $match: {
          userId,
          type: { $in: UPCOMING_TYPES },
          occurredAt: { $gte: now, $lte: horizon },
        },
      },
      { $sort: { occurredAt: 1 } },
      {
        $lookup: {
          from: "applications",
          localField: "applicationId",
          foreignField: "_id",
          as: "app",
        },
      },
      { $unwind: { path: "$app", preserveNullAndEmptyArrays: false } },
      { $match: { "app.userId": userId, "app.archivedAt": null } },
    ])
    .toArray();

  return NextResponse.json({
    events: docs.map((d) => ({
      _id: d._id instanceof ObjectId ? d._id.toHexString() : String(d._id),
      type: d.type,
      occurredAt: d.occurredAt.toISOString(),
      note: d.note || "",
      application: {
        _id:
          d.app._id instanceof ObjectId
            ? d.app._id.toHexString()
            : String(d.app._id),
        title: d.app.title,
        companyName: d.app.companyName || "",
        status: d.app.status,
        applyUrl: d.app.applyUrl || "",
      },
    })),
  });
}