import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, uuid, isoNow } from "../test-utils/test-app.js";
import type { TestContext } from "../test-utils/test-app.js";

describe("Categories API", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  const makeCategory = (overrides = {}) => ({
    id: uuid(),
    parentId: null,
    name: "Braking",
    slug: "braking",
    description: "Brake parts and components",
    level: 0,
    sortOrder: 0,
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  });

  describe("GET /api/v1/categories", () => {
    it("returns paginated list", async () => {
      const items = [makeCategory(), makeCategory({ name: "Engine", slug: "engine" })];
      ctx.mockDb._setResults(items, [{ total: 2 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/categories",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
    });

    it("filters by root categories", async () => {
      const items = [makeCategory()];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/categories?root=true",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });

    it("filters by parentId", async () => {
      const parentId = uuid();
      const items = [makeCategory({ parentId, level: 1 })];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/categories?parentId=${parentId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });

    it("supports search", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/categories?search=braking",
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/categories/:id", () => {
    it("returns category by id", async () => {
      const c = makeCategory();
      ctx.mockDb._setResults([c]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/categories/${c.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("Braking");
    });

    it("returns 404 for non-existent id", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/categories/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Category not found");
    });
  });

  describe("POST /api/v1/categories", () => {
    it("creates a category", async () => {
      const c = makeCategory();
      ctx.mockDb._setResults([c]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/categories",
        payload: { name: "Braking", slug: "braking" },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).name).toBe("Braking");
    });

    it("creates a subcategory with parentId", async () => {
      const parentId = uuid();
      const c = makeCategory({ parentId, level: 1 });
      ctx.mockDb._setResults([c]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/categories",
        payload: { name: "Braking", slug: "braking", parentId, level: 1 },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.parentId).toBe(parentId);
      expect(body.level).toBe(1);
    });

    it("validates required fields", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/categories",
        payload: {},
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/v1/categories/:id", () => {
    it("updates a category", async () => {
      const c = makeCategory({ name: "Braking Updated" });
      ctx.mockDb._setResults([c]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/categories/${c.id}`,
        payload: { name: "Braking Updated" },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("Braking Updated");
    });

    it("returns 404 for non-existent id", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/categories/${uuid()}`,
        payload: { name: "X" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/categories/:id", () => {
    it("deletes a category", async () => {
      ctx.mockDb._setResults([makeCategory()]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/categories/${uuid()}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 for non-existent id", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/categories/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
