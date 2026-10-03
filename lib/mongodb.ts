import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is missing. Add the MongoDB connection secret to this project.");
}

declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = globalThis.mongoClientPromise
  ? undefined
  : new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 10_000 });
const clientPromise =
  globalThis.mongoClientPromise ?? client!.connect();

if (process.env.NODE_ENV !== "production") {
  globalThis.mongoClientPromise = clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const connected = await clientPromise;
  return connected.db();
}