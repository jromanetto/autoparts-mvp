import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, uuid, isoNow } from "../test-utils/test-app.js";
import type { TestContext } from "../test-utils/test-app.js";

describe("Vehicles API", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  const makeMake = (overrides = {}) => ({
    id: uuid(),
    name: "Volkswagen",
    slug: "volkswagen",
    country: "Germany",
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  });

  const makeModel = (overrides = {}) => ({
    id: uuid(),
    makeId: uuid(),
    name: "Golf",
    slug: "golf",
    makeName: "Volkswagen",
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  });

  const makeVehicle = (overrides = {}) => ({
    id: uuid(),
    modelId: uuid(),
    yearStart: 2015,
    yearEnd: 2020,
    engineCode: "CJSA",
    engineDisplacementCc: 1395,
    fuelType: "petrol",
    bodyType: "hatchback",
    trim: "GTI",
    ktypeNumber: "12345",
    modelName: "Golf",
    makeName: "Volkswagen",
    modelSlug: "golf",
    makeSlug: "volkswagen",
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  });

  // === Makes ===
  describe("GET /api/v1/vehicles/makes", () => {
    it("returns paginated list of makes", async () => {
      const items = [makeMake()];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/vehicles/makes",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    it("supports search", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/vehicles/makes?search=volks",
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/vehicles/makes/:id", () => {
    it("returns make by id", async () => {
      const m = makeMake();
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/vehicles/makes/${m.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("Volkswagen");
    });

    it("returns 404 for non-existent make", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/vehicles/makes/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/vehicles/makes", () => {
    it("creates a make", async () => {
      const m = makeMake();
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/vehicles/makes",
        payload: { name: "Volkswagen", slug: "volkswagen" },
      });

      expect(res.statusCode).toBe(201);
    });

    it("validates required fields", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/vehicles/makes",
        payload: {},
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/v1/vehicles/makes/:id", () => {
    it("updates a make", async () => {
      const m = makeMake({ name: "VW" });
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/vehicles/makes/${m.id}`,
        payload: { name: "VW" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("returns 404 for non-existent make", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/vehicles/makes/${uuid()}`,
        payload: { name: "VW" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/vehicles/makes/:id", () => {
    it("deletes a make", async () => {
      ctx.mockDb._setResults([makeMake()]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/vehicles/makes/${uuid()}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 for non-existent make", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/vehicles/makes/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // === Models ===
  describe("GET /api/v1/vehicles/models", () => {
    it("returns paginated list of models", async () => {
      const items = [makeModel()];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/vehicles/models",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });

    it("filters by makeId", async () => {
      const makeId = uuid();
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/vehicles/models?makeId=${makeId}`,
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/vehicles/models/:id", () => {
    it("returns model by id", async () => {
      const m = makeModel();
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/vehicles/models/${m.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("Golf");
    });

    it("returns 404 for non-existent model", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/vehicles/models/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/vehicles/models", () => {
    it("creates a model", async () => {
      const m = makeModel();
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/vehicles/models",
        payload: { makeId: m.makeId, name: "Golf", slug: "golf" },
      });

      expect(res.statusCode).toBe(201);
    });

    it("validates required fields", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/vehicles/models",
        payload: { name: "Golf" },
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/v1/vehicles/models/:id", () => {
    it("updates a model", async () => {
      const m = makeModel({ name: "Golf GTI" });
      ctx.mockDb._setResults([m]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/vehicles/models/${m.id}`,
        payload: { name: "Golf GTI" },
      });

      expect(res.statusCode).toBe(200);
    });

    it("returns 404 for non-existent model", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/vehicles/models/${uuid()}`,
        payload: { name: "Golf GTI" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // === Vehicles (variants) ===
  describe("GET /api/v1/vehicles", () => {
    it("returns paginated list of vehicles", async () => {
      const items = [makeVehicle()];
      ctx.mockDb._setResults(items, [{ total: 1 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/vehicles",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
    });

    it("filters by year", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/vehicles?year=2018",
      });

      expect(res.statusCode).toBe(200);
    });

    it("filters by fuelType", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/vehicles?fuelType=diesel",
      });

      expect(res.statusCode).toBe(200);
    });

    it("filters by engineCode", async () => {
      ctx.mockDb._setResults([], [{ total: 0 }]);

      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/v1/vehicles?engineCode=CJSA",
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/vehicles/:id", () => {
    it("returns vehicle by id", async () => {
      const v = makeVehicle();
      ctx.mockDb._setResults([v]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/vehicles/${v.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.engineCode).toBe("CJSA");
    });

    it("returns 404 for non-existent vehicle", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "GET",
        url: `/api/v1/vehicles/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/vehicles", () => {
    it("creates a vehicle", async () => {
      const v = makeVehicle();
      ctx.mockDb._setResults([v]);

      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/vehicles",
        payload: {
          modelId: v.modelId,
          yearStart: 2015,
          yearEnd: 2020,
          engineCode: "CJSA",
          fuelType: "petrol",
        },
      });

      expect(res.statusCode).toBe(201);
    });

    it("validates required fields", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/v1/vehicles",
        payload: { yearStart: 2015 },
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/v1/vehicles/:id", () => {
    it("updates a vehicle", async () => {
      const v = makeVehicle({ yearEnd: 2022 });
      ctx.mockDb._setResults([v]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/vehicles/${v.id}`,
        payload: { yearEnd: 2022 },
      });

      expect(res.statusCode).toBe(200);
    });

    it("returns 404 for non-existent vehicle", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "PUT",
        url: `/api/v1/vehicles/${uuid()}`,
        payload: { yearEnd: 2022 },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/vehicles/:id", () => {
    it("deletes a vehicle", async () => {
      ctx.mockDb._setResults([makeVehicle()]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/vehicles/${uuid()}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 for non-existent vehicle", async () => {
      ctx.mockDb._setResults([]);

      const res = await ctx.app.inject({
        method: "DELETE",
        url: `/api/v1/vehicles/${uuid()}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
