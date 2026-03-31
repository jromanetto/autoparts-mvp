import type { FastifyPluginAsync } from "fastify";
import {
  partVehicleCompatibility,
  parts,
  vehicles,
  vehicleModels,
  vehicleMakes,
} from "@autoparts/db";
import { eq, count, and, asc, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  paginationSchema,
  paginate,
  paginatedResponse,
} from "../lib/pagination.js";

const createCompatibilitySchema = z.object({
  partId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  fitmentNotes: z.string().nullish(),
  quantityNeeded: z.number().int().min(1).default(1),
  position: z.string().max(100).nullish(),
  verified: z.boolean().default(false),
});

const updateCompatibilitySchema = z.object({
  fitmentNotes: z.string().nullish(),
  quantityNeeded: z.number().int().min(1).optional(),
  position: z.string().max(100).nullish(),
  verified: z.boolean().optional(),
});

const compatibilityRoutes: FastifyPluginAsync = async (app) => {
  // List all compatibility mappings (with filters)
  app.get("/", {
    schema: {
      tags: ["Compatibility"],
      summary: "List part-vehicle compatibility mappings",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          partId: { type: "string", format: "uuid" },
          vehicleId: { type: "string", format: "uuid" },
          verified: { type: "boolean" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = paginationSchema
        .extend({
          partId: z.string().uuid().optional(),
          vehicleId: z.string().uuid().optional(),
          verified: z.coerce.boolean().optional(),
        })
        .parse(request.query);
      const { limit, offset } = paginate(query);

      const conditions: SQL[] = [];
      if (query.partId) conditions.push(eq(partVehicleCompatibility.partId, query.partId));
      if (query.vehicleId) conditions.push(eq(partVehicleCompatibility.vehicleId, query.vehicleId));
      if (query.verified !== undefined)
        conditions.push(eq(partVehicleCompatibility.verified, query.verified));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select({
            id: partVehicleCompatibility.id,
            partId: partVehicleCompatibility.partId,
            vehicleId: partVehicleCompatibility.vehicleId,
            fitmentNotes: partVehicleCompatibility.fitmentNotes,
            quantityNeeded: partVehicleCompatibility.quantityNeeded,
            position: partVehicleCompatibility.position,
            verified: partVehicleCompatibility.verified,
            createdAt: partVehicleCompatibility.createdAt,
            partName: parts.name,
            partOemNumber: parts.oemNumber,
            makeName: vehicleMakes.name,
            modelName: vehicleModels.name,
            yearStart: vehicles.yearStart,
            yearEnd: vehicles.yearEnd,
          })
          .from(partVehicleCompatibility)
          .innerJoin(parts, eq(partVehicleCompatibility.partId, parts.id))
          .innerJoin(vehicles, eq(partVehicleCompatibility.vehicleId, vehicles.id))
          .leftJoin(vehicleModels, eq(vehicles.modelId, vehicleModels.id))
          .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
          .where(where)
          .orderBy(asc(parts.name))
          .limit(limit)
          .offset(offset),
        app.db
          .select({ total: count() })
          .from(partVehicleCompatibility)
          .where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Get vehicles compatible with a part
  app.get<{ Params: { partId: string } }>("/parts/:partId/vehicles", {
    schema: {
      tags: ["Compatibility"],
      summary: "List vehicles compatible with a specific part",
      params: {
        type: "object",
        required: ["partId"],
        properties: { partId: { type: "string", format: "uuid" } },
      },
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const { partId } = request.params;
      const query = paginationSchema.parse(request.query);
      const { limit, offset } = paginate(query);

      const where = eq(partVehicleCompatibility.partId, partId);

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select({
            compatibilityId: partVehicleCompatibility.id,
            vehicleId: vehicles.id,
            yearStart: vehicles.yearStart,
            yearEnd: vehicles.yearEnd,
            engineCode: vehicles.engineCode,
            fuelType: vehicles.fuelType,
            bodyType: vehicles.bodyType,
            trim: vehicles.trim,
            modelName: vehicleModels.name,
            makeName: vehicleMakes.name,
            fitmentNotes: partVehicleCompatibility.fitmentNotes,
            quantityNeeded: partVehicleCompatibility.quantityNeeded,
            position: partVehicleCompatibility.position,
            verified: partVehicleCompatibility.verified,
          })
          .from(partVehicleCompatibility)
          .innerJoin(vehicles, eq(partVehicleCompatibility.vehicleId, vehicles.id))
          .leftJoin(vehicleModels, eq(vehicles.modelId, vehicleModels.id))
          .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
          .where(where)
          .orderBy(asc(vehicleMakes.name), asc(vehicleModels.name))
          .limit(limit)
          .offset(offset),
        app.db
          .select({ total: count() })
          .from(partVehicleCompatibility)
          .where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Create compatibility mapping
  app.post("/", {
    schema: {
      tags: ["Compatibility"],
      summary: "Create a part-vehicle compatibility mapping",
      body: {
        type: "object",
        required: ["partId", "vehicleId"],
        properties: {
          partId: { type: "string", format: "uuid" },
          vehicleId: { type: "string", format: "uuid" },
          fitmentNotes: { type: "string", nullable: true },
          quantityNeeded: { type: "integer", minimum: 1, default: 1 },
          position: { type: "string", nullable: true },
          verified: { type: "boolean", default: false },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const body = createCompatibilitySchema.parse(request.body);

      // Verify both part and vehicle exist
      const [[part], [vehicle]] = await Promise.all([
        app.db
          .select({ id: parts.id })
          .from(parts)
          .where(eq(parts.id, body.partId))
          .limit(1),
        app.db
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.id, body.vehicleId))
          .limit(1),
      ]);

      if (!part) {
        return reply.code(404).send({ error: "Part not found" });
      }
      if (!vehicle) {
        return reply.code(404).send({ error: "Vehicle not found" });
      }

      const [created] = await app.db
        .insert(partVehicleCompatibility)
        .values(body)
        .returning();
      return reply.code(201).send(created);
    },
  });

  // Update compatibility mapping
  app.put<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Compatibility"],
      summary: "Update a compatibility mapping",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = updateCompatibilitySchema.parse(request.body);
      const [updated] = await app.db
        .update(partVehicleCompatibility)
        .set(body)
        .where(eq(partVehicleCompatibility.id, id))
        .returning();

      if (!updated) {
        return reply
          .code(404)
          .send({ error: "Compatibility mapping not found" });
      }
      return updated;
    },
  });

  // Delete compatibility mapping
  app.delete<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Compatibility"],
      summary: "Delete a compatibility mapping",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [deleted] = await app.db
        .delete(partVehicleCompatibility)
        .where(eq(partVehicleCompatibility.id, id))
        .returning();

      if (!deleted) {
        return reply
          .code(404)
          .send({ error: "Compatibility mapping not found" });
      }
      return reply.code(204).send();
    },
  });
};

export default compatibilityRoutes;
