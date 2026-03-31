import type { FastifyPluginAsync } from "fastify";
import { vehicleMakes, vehicleModels, vehicles } from "@autoparts/db";
import { eq, count, ilike, and, asc, desc, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  paginationSchema,
  paginate,
  paginatedResponse,
} from "../lib/pagination.js";

// --- Vehicle Makes ---

const createMakeSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  country: z.string().max(100).nullish(),
});

const updateMakeSchema = createMakeSchema.partial();

// --- Vehicle Models ---

const createModelSchema = z.object({
  makeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
});

const updateModelSchema = createModelSchema.partial();

// --- Vehicles ---

const createVehicleSchema = z.object({
  modelId: z.string().uuid(),
  yearStart: z.number().int().min(1900).max(2100),
  yearEnd: z.number().int().min(1900).max(2100).nullish(),
  engineCode: z.string().max(50).nullish(),
  engineDisplacementCc: z.number().int().positive().nullish(),
  fuelType: z.string().max(50).nullish(),
  bodyType: z.string().max(100).nullish(),
  trim: z.string().max(255).nullish(),
  ktypeNumber: z.string().max(50).nullish(),
});

const updateVehicleSchema = createVehicleSchema.partial();

const vehiclesRoutes: FastifyPluginAsync = async (app) => {
  // ============ MAKES ============

  // List makes
  app.get("/makes", {
    schema: {
      tags: ["Vehicles"],
      summary: "List vehicle makes",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          search: { type: "string" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = paginationSchema
        .extend({ search: z.string().optional() })
        .parse(request.query);
      const { limit, offset } = paginate(query);

      const where = query.search
        ? ilike(vehicleMakes.name, `%${query.search}%`)
        : undefined;

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select()
          .from(vehicleMakes)
          .where(where)
          .orderBy(asc(vehicleMakes.name))
          .limit(limit)
          .offset(offset),
        app.db.select({ total: count() }).from(vehicleMakes).where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Get make by ID
  app.get<{ Params: { id: string } }>("/makes/:id", {
    schema: {
      tags: ["Vehicles"],
      summary: "Get vehicle make by ID",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [make] = await app.db
        .select()
        .from(vehicleMakes)
        .where(eq(vehicleMakes.id, id))
        .limit(1);

      if (!make) {
        return reply.code(404).send({ error: "Vehicle make not found" });
      }
      return make;
    },
  });

  // Create make
  app.post("/makes", {
    schema: { tags: ["Vehicles"], summary: "Create vehicle make" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const body = createMakeSchema.parse(request.body);
      const [created] = await app.db
        .insert(vehicleMakes)
        .values(body)
        .returning();
      return reply.code(201).send(created);
    },
  });

  // Update make
  app.put<{ Params: { id: string } }>("/makes/:id", {
    schema: { tags: ["Vehicles"], summary: "Update vehicle make" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = updateMakeSchema.parse(request.body);
      const [updated] = await app.db
        .update(vehicleMakes)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(vehicleMakes.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Vehicle make not found" });
      }
      return updated;
    },
  });

  // Delete make
  app.delete<{ Params: { id: string } }>("/makes/:id", {
    schema: { tags: ["Vehicles"], summary: "Delete vehicle make" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [deleted] = await app.db
        .delete(vehicleMakes)
        .where(eq(vehicleMakes.id, id))
        .returning();

      if (!deleted) {
        return reply.code(404).send({ error: "Vehicle make not found" });
      }
      return reply.code(204).send();
    },
  });

  // ============ MODELS ============

  // List models (optionally filtered by make)
  app.get("/models", {
    schema: {
      tags: ["Vehicles"],
      summary: "List vehicle models",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          makeId: { type: "string", format: "uuid" },
          search: { type: "string" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = paginationSchema
        .extend({
          makeId: z.string().uuid().optional(),
          search: z.string().optional(),
        })
        .parse(request.query);
      const { limit, offset } = paginate(query);

      const conditions: SQL[] = [];
      if (query.makeId) conditions.push(eq(vehicleModels.makeId, query.makeId));
      if (query.search) conditions.push(ilike(vehicleModels.name, `%${query.search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select({
            id: vehicleModels.id,
            makeId: vehicleModels.makeId,
            name: vehicleModels.name,
            slug: vehicleModels.slug,
            createdAt: vehicleModels.createdAt,
            updatedAt: vehicleModels.updatedAt,
            makeName: vehicleMakes.name,
          })
          .from(vehicleModels)
          .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
          .where(where)
          .orderBy(asc(vehicleMakes.name), asc(vehicleModels.name))
          .limit(limit)
          .offset(offset),
        app.db.select({ total: count() }).from(vehicleModels).where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Get model by ID
  app.get<{ Params: { id: string } }>("/models/:id", {
    schema: {
      tags: ["Vehicles"],
      summary: "Get vehicle model by ID",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [model] = await app.db
        .select({
          id: vehicleModels.id,
          makeId: vehicleModels.makeId,
          name: vehicleModels.name,
          slug: vehicleModels.slug,
          createdAt: vehicleModels.createdAt,
          updatedAt: vehicleModels.updatedAt,
          makeName: vehicleMakes.name,
        })
        .from(vehicleModels)
        .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
        .where(eq(vehicleModels.id, id))
        .limit(1);

      if (!model) {
        return reply.code(404).send({ error: "Vehicle model not found" });
      }
      return model;
    },
  });

  // Create model
  app.post("/models", {
    schema: { tags: ["Vehicles"], summary: "Create vehicle model" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const body = createModelSchema.parse(request.body);
      const [created] = await app.db
        .insert(vehicleModels)
        .values(body)
        .returning();
      return reply.code(201).send(created);
    },
  });

  // Update model
  app.put<{ Params: { id: string } }>("/models/:id", {
    schema: { tags: ["Vehicles"], summary: "Update vehicle model" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = updateModelSchema.parse(request.body);
      const [updated] = await app.db
        .update(vehicleModels)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(vehicleModels.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Vehicle model not found" });
      }
      return updated;
    },
  });

  // ============ VEHICLES (specific variants) ============

  // List vehicles
  app.get("/", {
    schema: {
      tags: ["Vehicles"],
      summary: "List vehicle variants with filtering",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          modelId: { type: "string", format: "uuid" },
          year: { type: "integer" },
          fuelType: { type: "string" },
          engineCode: { type: "string" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = paginationSchema
        .extend({
          modelId: z.string().uuid().optional(),
          year: z.coerce.number().int().optional(),
          fuelType: z.string().optional(),
          engineCode: z.string().optional(),
        })
        .parse(request.query);
      const { limit, offset } = paginate(query);

      const conditions: SQL[] = [];
      if (query.modelId) conditions.push(eq(vehicles.modelId, query.modelId));
      if (query.fuelType) conditions.push(eq(vehicles.fuelType, query.fuelType));
      if (query.engineCode) conditions.push(eq(vehicles.engineCode, query.engineCode));
      if (query.year) {
        conditions.push(
          and(
            eq(vehicles.yearStart, query.year), // yearStart <= year
          )!
        );
        // Use raw SQL for range check
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select({
            id: vehicles.id,
            modelId: vehicles.modelId,
            yearStart: vehicles.yearStart,
            yearEnd: vehicles.yearEnd,
            engineCode: vehicles.engineCode,
            engineDisplacementCc: vehicles.engineDisplacementCc,
            fuelType: vehicles.fuelType,
            bodyType: vehicles.bodyType,
            trim: vehicles.trim,
            ktypeNumber: vehicles.ktypeNumber,
            createdAt: vehicles.createdAt,
            updatedAt: vehicles.updatedAt,
            modelName: vehicleModels.name,
            makeName: vehicleMakes.name,
          })
          .from(vehicles)
          .leftJoin(vehicleModels, eq(vehicles.modelId, vehicleModels.id))
          .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
          .where(where)
          .orderBy(asc(vehicleMakes.name), asc(vehicleModels.name), desc(vehicles.yearStart))
          .limit(limit)
          .offset(offset),
        app.db.select({ total: count() }).from(vehicles).where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Get vehicle by ID
  app.get<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Vehicles"],
      summary: "Get vehicle variant by ID",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [vehicle] = await app.db
        .select({
          id: vehicles.id,
          modelId: vehicles.modelId,
          yearStart: vehicles.yearStart,
          yearEnd: vehicles.yearEnd,
          engineCode: vehicles.engineCode,
          engineDisplacementCc: vehicles.engineDisplacementCc,
          fuelType: vehicles.fuelType,
          bodyType: vehicles.bodyType,
          trim: vehicles.trim,
          ktypeNumber: vehicles.ktypeNumber,
          createdAt: vehicles.createdAt,
          updatedAt: vehicles.updatedAt,
          modelName: vehicleModels.name,
          modelSlug: vehicleModels.slug,
          makeName: vehicleMakes.name,
          makeSlug: vehicleMakes.slug,
        })
        .from(vehicles)
        .leftJoin(vehicleModels, eq(vehicles.modelId, vehicleModels.id))
        .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
        .where(eq(vehicles.id, id))
        .limit(1);

      if (!vehicle) {
        return reply.code(404).send({ error: "Vehicle not found" });
      }
      return vehicle;
    },
  });

  // Create vehicle
  app.post("/", {
    schema: { tags: ["Vehicles"], summary: "Create vehicle variant" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const body = createVehicleSchema.parse(request.body);
      const [created] = await app.db
        .insert(vehicles)
        .values(body)
        .returning();
      return reply.code(201).send(created);
    },
  });

  // Update vehicle
  app.put<{ Params: { id: string } }>("/:id", {
    schema: { tags: ["Vehicles"], summary: "Update vehicle variant" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = updateVehicleSchema.parse(request.body);
      const [updated] = await app.db
        .update(vehicles)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(vehicles.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Vehicle not found" });
      }
      return updated;
    },
  });

  // Delete vehicle
  app.delete<{ Params: { id: string } }>("/:id", {
    schema: { tags: ["Vehicles"], summary: "Delete vehicle variant" },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [deleted] = await app.db
        .delete(vehicles)
        .where(eq(vehicles.id, id))
        .returning();

      if (!deleted) {
        return reply.code(404).send({ error: "Vehicle not found" });
      }
      return reply.code(204).send();
    },
  });
};

export default vehiclesRoutes;
