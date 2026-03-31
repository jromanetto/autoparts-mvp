import type { FastifyPluginAsync } from "fastify";
import {
  parts,
  manufacturers,
  categories,
  oemCrossReferences,
  partVehicleCompatibility,
  vehicles,
  vehicleModels,
  vehicleMakes,
} from "@autoparts/db";
import { eq, ilike, or, sql, count, and, type SQL } from "drizzle-orm";
import { z } from "zod";
import { paginationSchema, paginate, paginatedResponse } from "../lib/pagination.js";

const searchQuerySchema = paginationSchema.extend({
  q: z.string().min(1),
  type: z
    .enum(["parts", "vehicles"])
    .optional()
    .default("parts"),
});

const searchRoutes: FastifyPluginAsync = async (app) => {
  // Unified search endpoint
  app.get("/", {
    schema: {
      tags: ["Search"],
      summary: "Search parts by OEM number, name, or description",
      querystring: {
        type: "object",
        required: ["q"],
        properties: {
          q: { type: "string", minLength: 1 },
          type: { type: "string", enum: ["parts", "vehicles"], default: "parts" },
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = searchQuerySchema.parse(request.query);
      const { limit, offset } = paginate(query);

      if (query.type === "vehicles") {
        return searchVehicles(app, query.q, limit, offset, query);
      }

      return searchParts(app, query.q, limit, offset, query);
    },
  });

  // Search parts for a specific vehicle
  app.get<{ Params: { vehicleId: string } }>("/vehicles/:vehicleId/parts", {
    schema: {
      tags: ["Search"],
      summary: "Find parts compatible with a specific vehicle",
      params: {
        type: "object",
        required: ["vehicleId"],
        properties: { vehicleId: { type: "string", format: "uuid" } },
      },
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          categoryId: { type: "string", format: "uuid" },
          search: { type: "string" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const { vehicleId } = request.params;
      const query = paginationSchema
        .extend({
          categoryId: z.string().uuid().optional(),
          search: z.string().optional(),
        })
        .parse(request.query);
      const { limit, offset } = paginate(query);

      const conditions: SQL[] = [
        eq(partVehicleCompatibility.vehicleId, vehicleId),
      ];
      if (query.categoryId) {
        conditions.push(eq(parts.categoryId, query.categoryId));
      }
      if (query.search) {
        conditions.push(ilike(parts.name, `%${query.search}%`));
      }

      const where = and(...conditions);

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select({
            id: parts.id,
            oemNumber: parts.oemNumber,
            name: parts.name,
            status: parts.status,
            manufacturerName: manufacturers.name,
            categoryName: categories.name,
            fitmentNotes: partVehicleCompatibility.fitmentNotes,
            quantityNeeded: partVehicleCompatibility.quantityNeeded,
            position: partVehicleCompatibility.position,
            verified: partVehicleCompatibility.verified,
          })
          .from(partVehicleCompatibility)
          .innerJoin(parts, eq(partVehicleCompatibility.partId, parts.id))
          .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
          .leftJoin(categories, eq(parts.categoryId, categories.id))
          .where(where)
          .orderBy(parts.name)
          .limit(limit)
          .offset(offset),
        app.db
          .select({ total: count() })
          .from(partVehicleCompatibility)
          .innerJoin(parts, eq(partVehicleCompatibility.partId, parts.id))
          .where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Search by OEM number (including cross-references)
  app.get("/oem/:oemNumber", {
    schema: {
      tags: ["Search"],
      summary: "Search parts by OEM number (includes cross-references)",
      params: {
        type: "object",
        required: ["oemNumber"],
        properties: { oemNumber: { type: "string" } },
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
      const { oemNumber } = request.params as { oemNumber: string };
      const query = paginationSchema.parse(request.query);
      const { limit, offset } = paginate(query);

      // Search in both parts.oem_number and cross-references
      const directMatches = app.db
        .select({
          id: parts.id,
          oemNumber: parts.oemNumber,
          name: parts.name,
          status: parts.status,
          manufacturerId: parts.manufacturerId,
          manufacturerName: manufacturers.name,
          matchType: sql<string>`'direct'`.as("match_type"),
        })
        .from(parts)
        .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
        .where(ilike(parts.oemNumber, `%${oemNumber}%`));

      const crossRefMatches = app.db
        .select({
          id: parts.id,
          oemNumber: parts.oemNumber,
          name: parts.name,
          status: parts.status,
          manufacturerId: parts.manufacturerId,
          manufacturerName: manufacturers.name,
          matchType: sql<string>`'cross_reference'`.as("match_type"),
        })
        .from(oemCrossReferences)
        .innerJoin(parts, eq(oemCrossReferences.partId, parts.id))
        .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
        .where(ilike(oemCrossReferences.crossRefOemNumber, `%${oemNumber}%`));

      // Use UNION to combine results
      const data = await app.db
        .select()
        .from(
          sql`(${directMatches} UNION ${crossRefMatches}) as combined`
        )
        .limit(limit)
        .offset(offset);

      return {
        data,
        query: oemNumber,
        pagination: { page: query.page, limit: query.limit },
      };
    },
  });
};

// Helper: search parts by name/OEM/description
async function searchParts(
  app: { db: import("@autoparts/db").Database },
  q: string,
  limit: number,
  offset: number,
  query: z.infer<typeof paginationSchema>
) {
  const searchCondition = or(
    ilike(parts.name, `%${q}%`),
    ilike(parts.oemNumber, `%${q}%`),
    ilike(parts.description, `%${q}%`)
  );

  const [data, [{ total }]] = await Promise.all([
    app.db
      .select({
        id: parts.id,
        oemNumber: parts.oemNumber,
        name: parts.name,
        description: parts.description,
        status: parts.status,
        manufacturerName: manufacturers.name,
        categoryName: categories.name,
      })
      .from(parts)
      .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
      .leftJoin(categories, eq(parts.categoryId, categories.id))
      .where(searchCondition)
      .orderBy(parts.name)
      .limit(limit)
      .offset(offset),
    app.db.select({ total: count() }).from(parts).where(searchCondition),
  ]);

  return paginatedResponse(data, total, query);
}

// Helper: search vehicles by make/model/engine
async function searchVehicles(
  app: { db: import("@autoparts/db").Database },
  q: string,
  limit: number,
  offset: number,
  query: z.infer<typeof paginationSchema>
) {
  const searchCondition = or(
    ilike(vehicleMakes.name, `%${q}%`),
    ilike(vehicleModels.name, `%${q}%`),
    ilike(vehicles.engineCode, `%${q}%`),
    ilike(vehicles.ktypeNumber, `%${q}%`)
  );

  const [data, [{ total }]] = await Promise.all([
    app.db
      .select({
        id: vehicles.id,
        yearStart: vehicles.yearStart,
        yearEnd: vehicles.yearEnd,
        engineCode: vehicles.engineCode,
        fuelType: vehicles.fuelType,
        bodyType: vehicles.bodyType,
        trim: vehicles.trim,
        ktypeNumber: vehicles.ktypeNumber,
        modelName: vehicleModels.name,
        makeName: vehicleMakes.name,
      })
      .from(vehicles)
      .leftJoin(vehicleModels, eq(vehicles.modelId, vehicleModels.id))
      .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
      .where(searchCondition)
      .orderBy(vehicleMakes.name, vehicleModels.name)
      .limit(limit)
      .offset(offset),
    app.db
      .select({ total: count() })
      .from(vehicles)
      .leftJoin(vehicleModels, eq(vehicles.modelId, vehicleModels.id))
      .leftJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
      .where(searchCondition),
  ]);

  return paginatedResponse(data, total, query);
}

export default searchRoutes;
