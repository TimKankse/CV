import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let schemaReady: Promise<void> | null = null;

function getD1() {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export async function ensureDatabase() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const d1 = getD1();
      await d1.batch([
        d1.prepare(`CREATE TABLE IF NOT EXISTS cv_documents (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          document_json TEXT NOT NULL,
          styles_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`),
        d1.prepare(`CREATE INDEX IF NOT EXISTS idx_cv_documents_updated_at
          ON cv_documents(updated_at)`),
      ]);
      await d1.prepare("PRAGMA optimize").run();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}
