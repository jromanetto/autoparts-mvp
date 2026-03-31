import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, uuid, isoNow } from "../test-utils/test-app.js";
import type { TestContext } from "../test-utils/test-app.js";

describe("Manufacturers API", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  const makeManufacturer = (overrides = {}) => ({
    id: uuid(),
    name: "Bosch",
    slug: "bosch",
    country: "Germany",
    website: "https://bosch.com",
    logoUrl: null,
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  });

  describe("GET /api/v1/manufacturers", () => {
    it("returns paginated list", async () => {
      const items = [makeManufacturer(), makeManufacturer({ name: "Valeo", slug: "valeo" })];
      ctx.mockDb._setResults(items, [{ total: 2 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/manufacturers",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it("supports search query", async () => {
      const items = [makeManufacturer()];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/manufacturers?search=bosch",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });

    it("supports pagination params", async () => {
      ctx.mockDb._setResults([], [{ total: 50 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/manufacturers?page=3&limit=10",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.pagination.page).toBe(3);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.totalPages).toBe(5);
    });

    it("supports sort and order", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/manufacturers?sort=createdAt&order=desc",
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/manufacturers/:id", () => {
    it("returns manufacturer by id", async () => {
      const m = makeManufacturer();
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/manufacturers/${m.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("Bosch");
    });

    it("returns 404 for non-existent id", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/manufacturers/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("Manufacturer not found");
    });
  });

  describe("POST /api/v1/manufacturers", () => {
    it("creates a manufacturer", async () => {
      const m = makeManufacturer();
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/manufacturers",
        payload: { name: "Bosch", slug: "bosch", country: "Germany" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("Bosch");
    });

    it("validates required fields", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/manufacturers",
        payload: {},
      });

      // Zod validation will throw, Fastify returns 400 or 500
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it("validates name min length", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/manufacturers",
        payload: { name: "", slug: "test" },
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/v1/manufacturers/:id", () => {
    it("updates a manufacturer", async () => {
      const m = makeManufacturer({ name: "Bosch Updated" });
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/manufacturers/${m.id}`,
        payload: { name: "Bosch Updated" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("Bosch Updated");
    });

    it("returns 404 for non-existent id", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/manufacturers/${uuid()}`,
        payload: { name: "Updated" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/manufacturers/:id", () => {
    it("deletes a manufacturer", async () => {
      const m = makeManufacturer();
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/manufacturers/${m.id}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 for non-existent id", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/manufacturers/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
