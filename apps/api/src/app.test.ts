import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "./app.js";

describe("App", () => {
  it("should respond to health check", async () => {
    const app = await buildApp();
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
    const app = await buildApp();
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
});
