import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, uuid, isoNow } from "../test-utils/test-app.js";
import type { TestContext } from "../test-utils/test-app.js";

describe("Parts API", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  const makePart = (overrides = {}) => ({
    id: uuid(),
    oemNumber: "0986478868",
    name: "Brake Disc",
    description: "Ventilated brake disc for front axle",
    specifications: { diameter: 280 },
    weightGrams: 5200,
    dimensions: { lengthMm: 280, widthMm: 280, heightMm: 50 },
    imageUrls: [],
    status: "active",
    manufacturerId: uuid(),
    categoryId: uuid(),
    manufacturerName: "Bosch",
    manufacturerSlug: "bosch",
    categoryName: "Braking",
    categorySlug: "braking",
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  });

  const makeCrossRef = (overrides = {}) => ({
    id: uuid(),
    partId: uuid(),
    crossRefOemNumber: "DF4183",
    crossRefManufacturer: "TRW",
    crossRefType: "equivalent",
    notes: null,
    createdAt: isoNow(),
    ...overrides,
  });

  describe("GET /api/v1/parts", () => {
    it("returns paginated list with manufacturer and category names", async () => {
      const items = [makePart()];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/parts",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    it("filters by manufacturerId", async () => {
      const mfgId = uuid();
      ctx.mockDb._setResults([makePart({ manufacturerId: mfgId })], [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/parts?manufacturerId=${mfgId}`,
      });

      expect(res.statusCode).toBe(200);
    });

    it("filters by status", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/parts?status=discontinued",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });

    it("filters by search", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/parts?search=brake",
      });

      expect(res.statusCode).toBe(200);
    });

    it("supports sort and order params", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/parts?sort=oemNumber&order=asc",
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/parts/:id", () => {
    it("returns part with full details and cross-references", async () => {
      const p = makePart();
      const crossRefs = [makeCrossRef({ partId: p.id })];
      // Route does two queries: select part, then select crossRefs
      ctx.mockDb._setResults([p], crossRefs);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/parts/${p.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("Brake Disc");
      expect(body.crossReferences).toHaveLength(1);
      expect(body.crossReferences[0].crossRefOemNumber).toBe("DF4183");
    });

    it("returns 404 for non-existent part", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/parts/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Part not found");
    });
  });

  describe("POST /api/v1/parts", () => {
    it("creates a part", async () => {
      const p = makePart();
      ctx.mockDb._setResults([p]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/parts",
        payload: {
          oemNumber: "0986478868",
          manufacturerId: p.manufacturerId,
          name: "Brake Disc",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).oemNumber).toBe("0986478868");
    });

    it("creates a part with all optional fields", async () => {
      const p = makePart();
      ctx.mockDb._setResults([p]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/parts",
        payload: {
          oemNumber: "0986478868",
          manufacturerId: p.manufacturerId,
          name: "Brake Disc",
          categoryId: p.categoryId,
          description: "Front axle",
          specifications: { diameter: 280 },
          weightGrams: 5200,
          dimensions: { lengthMm: 280 },
          imageUrls: ["https://example.com/img.jpg"],
          status: "pending",
        },
      });

      expect(res.statusCode).toBe(201);
    });

    it("rejects missing required fields", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/parts",
        payload: { name: "Brake Disc" },
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/v1/parts/:id", () => {
    it("updates a part", async () => {
      const p = makePart({ name: "Updated Brake Disc" });
      ctx.mockDb._setResults([p]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/parts/${p.id}`,
        payload: { name: "Updated Brake Disc" },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("Updated Brake Disc");
    });

    it("returns 404 for non-existent part", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/parts/${uuid()}`,
        payload: { name: "X" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/parts/:id", () => {
    it("deletes a part", async () => {
      ctx.mockDb._setResults([makePart()]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/parts/${uuid()}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 for non-existent part", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/parts/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/v1/parts/:id/cross-references", () => {
    it("returns cross-references for a part", async () => {
      const partId = uuid();
      const refs = [makeCrossRef({ partId }), makeCrossRef({ partId, crossRefOemNumber: "ABC123" })];
      ctx.mockDb._setResults(refs);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/parts/${partId}/cross-references`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
    });

    it("returns empty array when no cross-references exist", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/parts/${uuid()}/cross-references`,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data).toHaveLength(0);
    });
  });

  describe("POST /api/v1/parts/:id/cross-references", () => {
    it("adds a cross-reference to a part", async () => {
      const partId = uuid();
      const ref = makeCrossRef({ partId });
      // First query: check part exists; second: insert cross-ref
      ctx.mockDb._setResults([{ id: partId }], [ref]);

      const res = await ctx.app.inject({
        method: "POST",
        url: `/api/v1/parts/${partId}/cross-references`,
        payload: {
          crossRefOemNumber: "DF4183",
          crossRefManufacturer: "TRW",
          crossRefType: "equivalent",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).crossRefOemNumber).toBe("DF4183");
    });

    it("returns 404 if part does not exist", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "POST",
        url: `/api/v1/parts/${uuid()}/cross-references`,
        payload: { crossRefOemNumber: "DF4183" },
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Part not found");
    });
  });
});
