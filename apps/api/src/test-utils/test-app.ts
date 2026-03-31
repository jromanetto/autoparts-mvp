import { buildApp } from "../app.js";
import { createMockDb, type MockDb } from "./mock-db.js";

export interface TestContext {
  app: Awaited<ReturnType<typeof buildApp>>;
  mockDb: MockDb;
}

/**
 * Creates a Fastify app wired with a mock DB.
 * Auth is skipped by default (no API_KEYS env var).
 */
export async function createTestApp(): Promise<TestContext> {
  const mockDb = createMockDb();

  const app = await buildApp({ skipDb: true });
  // Decorate manually since we skipped the db plugin
  app.decorate("db", mockDb as never);

  return { app, mockDb };
}

/**
 * Creates a test app with API key auth enabled.
 */
export async function createTestAppWithAuth(
  apiKey = "test-api-key-123"
): Promise<TestContext & { apiKey: string }> {
  const original = process.env.API_KEYS;
  process.env.API_KEYS = apiKey;

  const mockDb = createMockDb();
  const app = await buildApp({ skipDb: true });
  app.decorate("db", mockDb as never);

  // Restore env so other tests aren't affected
  if (original === undefined) {
    delete process.env.API_KEYS;
  } else {
    process.env.API_KEYS = original;
  }

  return { app, mockDb, apiKey };
}

/** Random UUID for test fixtures */
export function uuid() {
  return crypto.randomUUID();
}

/** Standard ISO timestamp string */
export function isoNow() {
  return new Date().toISOString();
}
