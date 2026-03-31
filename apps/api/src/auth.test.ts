import { describe, it, expect, afterAll } from "vitest";
import { createTestAppWithAuth, uuid } from "./test-utils/test-app.js";

describe("Authentication", () => {
  it("rejects requests without API key when auth is enabled", async () => {
    const { app } = await createTestAppWithAuth("secret-key-42");
    afterAll(() => app.close());

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/manufacturers",
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Unauthorized");
    expect(body.message).toBe("Invalid or missing API key");
  });

  it("rejects requests with invalid API key", async () => {
    const { app } = await createTestAppWithAuth("secret-key-42");
    afterAll(() => app.close());

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/manufacturers",
      headers: { "x-api-key": "wrong-key" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("accepts requests with valid X-API-Key header", async () => {
    const { app, mockDb, apiKey } = await createTestAppWithAuth("secret-key-42");
    afterAll(() => app.close());

    mockDb._setResults([], [{ total: 0 }]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/manufacturers",
      headers: { "x-api-key": apiKey },
    });

    expect(res.statusCode).toBe(200);
  });

  it("accepts requests with Bearer token", async () => {
    const { app, mockDb, apiKey } = await createTestAppWithAuth("secret-key-42");
    afterAll(() => app.close());

    mockDb._setResults([], [{ total: 0 }]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/manufacturers",
      headers: { authorization: `Bearer ${apiKey}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("allows health check without auth", async () => {
    const { app } = await createTestAppWithAuth("secret-key-42");
    afterAll(() => app.close());

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
  });

  it("skips auth when no API_KEYS configured (dev mode)", async () => {
    // createTestAppWithAuth restores original env, but for this test
    // we explicitly test without keys
    const original = process.env.API_KEYS;
    delete process.env.API_KEYS;

    const { buildApp } = await import("./app.js");
    const { createMockDb } = await import("./test-utils/mock-db.js");
    const app = await buildApp({ skipDb: true });
    const mockDb = createMockDb();
    app.decorate("db", mockDb as never);

    mockDb._setResults([], [{ total: 0 }]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/manufacturers",
    });

    expect(res.statusCode).toBe(200);

    await app.close();
    if (original !== undefined) process.env.API_KEYS = original;
  });

  it("rejects auth on all protected routes", async () => {
    const { app } = await createTestAppWithAuth("secret-key-42");
    afterAll(() => app.close());

    const protectedRoutes = [
      { method: "GET" as const, url: "/api/v1/manufacturers" },
      { method: "GET" as const, url: `/api/v1/manufacturers/${uuid()}` },
      { method: "GET" as const, url: "/api/v1/categories" },
      { method: "GET" as const, url: "/api/v1/parts" },
      { method: "GET" as const, url: "/api/v1/vehicles" },
      { method: "GET" as const, url: "/api/v1/vehicles/makes" },
      { method: "GET" as const, url: "/api/v1/vehicles/models" },
      { method: "GET" as const, url: "/api/v1/search?q=test" },
      { method: "GET" as const, url: "/api/v1/compatibility" },
    ];

    for (const route of protectedRoutes) {
      const res = await app.inject(route);
      expect(res.statusCode).toBe(401);
    }
  });
});
