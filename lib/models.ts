// Queuti data models — plain TS interfaces + typed collection accessors.
// Collections: users, applications, events, contacts, companies.
// Using the native driver (no Mongoose): lean, typed, aggregation-friendly.

import type { ObjectId } from "mongodb";
import type { Collection, Document, Filter, WithId } from "mongodb";
import { connectToDb } from "./mongodb";

// ---------- Types ----------

export type ApplicationStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

/** A job application the user has made. */
export interface Application {
  _id?: ObjectId;
  userId: ObjectId;
  companyId?: ObjectId;
  title: string;
  companyName?: string; // denormalized for display before company resolution
  applyUrl?: string;
  hiringEmail?: string;
  source?: string; // e.g. "linkedin", "seek", "direct"
  status: ApplicationStatus;
  dateApplied: Date;
  /** Set on the first status change away from "applied" (unless ghosted) — enables avg-response-days analytics. */
  respondedAt?: Date;
  salary?: string;
  notes?: string;
  /** Pasted job description — input to the browser role-fit scorer (#17). */
  jd?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A tracked event in the lifecycle of an application (interview, follow-up…). */
export interface ApplicationEvent {
  _id?: ObjectId;
  userId: ObjectId;
  applicationId: ObjectId;
  type: string; // "application", "screening", "interview", "offer", "rejection", "follow_up", …
  occurredAt: Date;
  note?: string;
  createdAt: Date;
}

/** A contact met during the job hunt (recruiter, hiring manager…). */
export interface Contact {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  email?: string;
  phone?: string;
  companyId?: ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A company the user has applied to or researched. */
export interface Company {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Auth user record. Passwords stored as bcrypt hashes (see auth task). */
export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash?: string;
  name?: string;
  /** SHA-256 hash of the active password-reset token (see lib/reset.ts). */
  resetTokenHash?: string;
  /** When the current reset token expires (1h after issue). */
  resetTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Collection accessors ----------

export const COLLECTIONS = {
  users: "users",
  applications: "applications",
  events: "events",
  contacts: "contacts",
  companies: "companies",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

async function getCollection<T extends Document>(
  name: CollectionName
): Promise<Collection<T>> {
  const db = await connectToDb();
  return db.collection<T>(name);
}

export const users = () => getCollection<User>(COLLECTIONS.users);
export const applications = () =>
  getCollection<Application>(COLLECTIONS.applications);
export const events = () => getCollection<ApplicationEvent>(COLLECTIONS.events);
export const contacts = () => getCollection<Contact>(COLLECTIONS.contacts);
export const companies = () => getCollection<Company>(COLLECTIONS.companies);

// ---------- Indexes (idempotent, run at startup) ----------

export async function ensureIndexes(): Promise<void> {
  const [appCol, evCol, usrCol] = await Promise.all([
    applications(),
    events(),
    users(),
  ]);
  await Promise.all([
    appCol.createIndex({ userId: 1, dateApplied: -1 }),
    appCol.createIndex({ userId: 1, status: 1 }),
    evCol.createIndex({ applicationId: 1, occurredAt: -1 }),
    usrCol.createIndex({ email: 1 }, { unique: true }),
  ]);
}

export type { Filter, WithId };