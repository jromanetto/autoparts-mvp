import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, uuid, isoNow } from "../test-utils/test-app.js";
import type { TestContext } from "../test-utils/test-app.js";

describe("Compatibility API", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  const makeCompat = (overrides = {}) => ({
    id: uuid(),
    partId: uuid(),
    vehicleId: uuid(),
    fitmentNotes: "Front axle, left side",
    quantityNeeded: 2,
    position: "front-left",
    verified: false,
    partName: "Brake Disc",
    partOemNumber: "0986478868",
    makeName: "Volkswagen",
    modelName: "Golf",
    yearStart: 2015,
    yearEnd: 2020,
    createdAt: isoNow(),
    ...overrides,
  });

  describe("GET /api/v1/compatibility", () => {
    it("returns paginated compatibility mappings", async () => {
      const items = [makeCompat()];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/compatibility",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    it("filters by partId", async () => {
      const partId = uuid();
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/compatibility?partId=${partId}`,
      });

      expect(res.statusCode).toBe(200);
    });

    it("filters by vehicleId", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/compatibility?vehicleId=${uuid()}`,
      });

      expect(res.statusCode).toBe(200);
    });

    it("filters by verified status", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/compatibility?verified=true",
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/compatibility/parts/:partId/vehicles", () => {
    it("returns vehicles compatible with a part", async () => {
      const partId = uuid();
      const items = [
        makeCompat({ partId }),
        makeCompat({ partId, position: "front-right" }),
      ];
      ctx.mockDb._setResults(items, [{ total: 2 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/compatibility/parts/${partId}/vehicles`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
    });

    it("returns empty array when no vehicles match", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/compatibility/parts/${uuid()}/vehicles`,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data).toHaveLength(0);
    });
  });

  describe("POST /api/v1/compatibility", () => {
    it("creates a compatibility mapping", async () => {
      const partId = uuid();
      const vehicleId = uuid();
      const compat = makeCompat({ partId, vehicleId });
      // Route verifies part exists, then vehicle exists, then inserts
      ctx.mockDb._setResults([{ id: partId }], [{ id: vehicleId }], [compat]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/compatibility",
        payload: {
          partId,
          vehicleId,
          fitmentNotes: "Front axle, left side",
          quantityNeeded: 2,
          position: "front-left",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.partId).toBe(partId);
    });

    it("returns 404 if part does not exist", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/compatibility",
        payload: {
          partId: uuid(),
          vehicleId: uuid(),
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 404 if vehicle does not exist", async () => {
      // Part exists, vehicle does not
      ctx.mockDb._setResults([{ id: uuid() }], []);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/compatibility",
        payload: {
          partId: uuid(),
          vehicleId: uuid(),
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it("validates required fields", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/compatibility",
        payload: {},
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/v1/compatibility/:id", () => {
    it("updates fitment metadata", async () => {
      const compat = makeCompat({ verified: true });
      ctx.mockDb._setResults([compat]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/compatibility/${compat.id}`,
        payload: { verified: true, fitmentNotes: "Updated notes" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("returns 404 for non-existent mapping", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/compatibility/${uuid()}`,
        payload: { verified: true },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/compatibility/:id", () => {
    it("deletes a compatibility mapping", async () => {
      ctx.mockDb._setResults([makeCompat()]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/compatibility/${uuid()}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 for non-existent mapping", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/compatibility/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
