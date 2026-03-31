import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, uuid, isoNow } from "../test-utils/test-app.js";
import type { TestContext } from "../test-utils/test-app.js";

describe("Search API", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  describe("GET /api/v1/search", () => {
    it("searches parts by default", async () => {
      const items = [
        {
          id: uuid(),
          oemNumber: "0986478868",
          name: "Brake Disc",
          status: "active",
          manufacturerName: "Bosch",
          categoryName: "Braking",
          createdAt: isoNow(),
        },
      ];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/search?q=brake",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    it("searches vehicles when type=vehicles", async () => {
      const items = [
        {
          id: uuid(),
          makeName: "Volkswagen",
          modelName: "Golf",
          yearStart: 2015,
          yearEnd: 2020,
          engineCode: "CJSA",
          createdAt: isoNow(),
        },
      ];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/search?q=golf&type=vehicles",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });

    it("requires q parameter", async () => {
      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/search",
      });

      // Zod validation requires q with min 1 char
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it("rejects empty q parameter", async () => {
      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/search?q=",
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it("supports pagination", async () => {
      ctx.mockDb._setResults([], [{ total: 100 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/search?q=brake&page=2&limit=10",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(10);
    });
  });

  describe("GET /api/v1/search/vehicles/:vehicleId/parts", () => {
    it("returns parts compatible with a vehicle", async () => {
      const vehicleId = uuid();
      const items = [
        {
          id: uuid(),
          partId: uuid(),
          vehicleId,
          fitmentNotes: "Front axle only",
          quantityNeeded: 2,
          position: "front",
          verified: true,
          name: "Brake Disc",
          oemNumber: "0986478868",
          manufacturerName: "Bosch",
          categoryName: "Braking",
        },
      ];
      // Route does: select data + select count
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/search/vehicles/${vehicleId}/parts`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });

    it("supports categoryId filter", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/search/vehicles/${uuid()}/parts?categoryId=${uuid()}`,
      });

      expect(res.statusCode).toBe(200);
    });

    it("supports search filter", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/search/vehicles/${uuid()}/parts?search=brake`,
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/search/oem/:oemNumber", () => {
    it("returns parts matching OEM number", async () => {
      const items = [
        {
          id: uuid(),
          oemNumber: "0986478868",
          name: "Brake Disc",
          manufacturerName: "Bosch",
          matchType: "direct",
        },
      ];
      ctx.mockDb._setResults(items);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/search/oem/0986478868",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.query).toBe("0986478868");
    });

    it("returns empty results for unknown OEM number", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/search/oem/UNKNOWN999",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });
  });
});
