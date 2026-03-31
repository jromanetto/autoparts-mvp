import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "./app.js";

describe("App", () => {
  it("should respond to health check", async () => {
    const app = await buildApp({ skipDb: true });
    afterAll(() => app.close());

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("should serve OpenAPI docs", async () => {
    const app = await buildApp({ skipDb: true });
    afterAll(() => app.close());

    const response = await app.inject({
      method: "GET",
      url: "/docs/json",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.openapi).toBeDefined();
    expect(body.info.title).toBe("AutoParts API");
  });

  it("should have API v1 route prefixes in OpenAPI spec", async () => {
    const app = await buildApp({ skipDb: true });
    afterAll(() => app.close());

    const response = await app.inject({
      method: "GET",
      url: "/docs/json",
    });

    const body = JSON.parse(response.body);
    const paths = Object.keys(body.paths || {});

    expect(paths.some((p: string) => p.startsWith("/api/v1/parts"))).toBe(true);
    expect(paths.some((p: string) => p.startsWith("/api/v1/manufacturers"))).toBe(true);
    expect(paths.some((p: string) => p.startsWith("/api/v1/categories"))).toBe(true);
    expect(paths.some((p: string) => p.startsWith("/api/v1/vehicles"))).toBe(true);
    expect(paths.some((p: string) => p.startsWith("/api/v1/search"))).toBe(true);
    expect(paths.some((p: string) => p.startsWith("/api/v1/compatibility"))).toBe(true);
  });

  it("should include API key security scheme", async () => {
    const app = await buildApp({ skipDb: true });
    afterAll(() => app.close());

    const response = await app.inject({
      method: "GET",
      url: "/docs/json",
    });

    const body = JSON.parse(response.body);
    expect(body.components?.securitySchemes?.apiKey).toBeDefined();
    expect(body.components.securitySchemes.apiKey.type).toBe("apiKey");
  });
});
