import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGODB_DB || "queuti";

// NOTE: no throw at module scope — that would break `next build` in CI
// when secrets are absent. The error surfaces lazily on first connect,
// which is where it belongs at runtime anyway.

// Next.js dev hot-reload guard: cache the client on globalThis so we don't
// open a new connection pool on every module reload.
const globalForMongo = globalThis as unknown as {
  mongoClient?: MongoClient;
};

function createClient(): MongoClient {
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Add it to .env.local (gitignored) or the Vercel env."
    );
  }
  const client = new MongoClient(uri, {
    // Atlas free tier: keep pool small, useful defaults
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  return client;
}

export async function connectToDb(): Promise<Db> {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = createClient();
  }
  const client = globalForMongo.mongoClient;
  await client.connect();
  return client.db(dbName);
}

export async function pingDb(): Promise<{ ok: boolean; latencyMs?: number }> {
  const started = Date.now();
  try {
    const db = await connectToDb();
    await db.command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
    };
  }
}

export { dbName };