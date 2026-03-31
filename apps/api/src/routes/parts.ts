import type { FastifyPluginAsync } from "fastify";
import {
  parts,
  manufacturers,
  categories,
  oemCrossReferences,
} from "@autoparts/db";
import { eq, count, ilike, and, asc, desc } from "drizzle-orm";
import { z } from "zod";
import {
  paginationSchema,
  paginate,
  paginatedResponse,
} from "../lib/pagination.js";

const createPartSchema = z.object({
  oemNumber: z.string().min(1).max(100),
  manufacturerId: z.string().uuid(),
  categoryId: z.string().uuid().nullish(),
  name: z.string().min(1).max(500),
  description: z.string().nullish(),
  specifications: z.record(z.unknown()).nullish(),
  weightGrams: z.number().int().positive().nullish(),
  dimensions: z
    .object({
      lengthMm: z.number().positive().optional(),
      widthMm: z.number().positive().optional(),
      heightMm: z.number().positive().optional(),
    })
    .nullish(),
  imageUrls: z.array(z.string().url()).nullish(),
  status: z.enum(["active", "discontinued", "pending"]).default("active"),
});

const updatePartSchema = createPartSchema.partial();

const listQuerySchema = paginationSchema.extend({
  manufacturerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["active", "discontinued", "pending"]).optional(),
  search: z.string().optional(),
  sort: z
    .enum(["name", "oemNumber", "createdAt"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

const createCrossRefSchema = z.object({
  crossRefOemNumber: z.string().min(1).max(100),
  crossRefManufacturer: z.string().max(255).nullish(),
  crossRefType: z.string().max(50).default("equivalent"),
  notes: z.string().nullish(),
});

const partsRoutes: FastifyPluginAsync = async (app) => {
  // List parts
  app.get("/", {
    schema: {
      tags: ["Parts"],
      summary: "List parts with filtering and pagination",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          manufacturerId: { type: "string", format: "uuid" },
          categoryId: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["active", "discontinued", "pending"],
          },
          search: { type: "string" },
          sort: {
            type: "string",
            enum: ["name", "oemNumber", "createdAt"],
            default: "createdAt",
          },
          order: { type: "string", enum: ["asc", "desc"], default: "desc" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = listQuerySchema.parse(request.query);
      const { limit, offset } = paginate(query);

      const conditions = [];
      if (query.manufacturerId)
        conditions.push(eq(parts.manufacturerId, query.manufacturerId));
      if (query.categoryId)
        conditions.push(eq(parts.categoryId, query.categoryId));
      if (query.status) conditions.push(eq(parts.status, query.status));
      if (query.search) {
        conditions.push(ilike(parts.name, `%${query.search}%`));
      }

      const where =
        conditions.length > 0 ? and(...conditions) : undefined;

      const sortMap = {
        name: parts.name,
        oemNumber: parts.oemNumber,
        createdAt: parts.createdAt,
      } as const;
      const sortCol = sortMap[query.sort];
      const orderFn = query.order === "desc" ? desc : asc;

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select({
            id: parts.id,
            oemNumber: parts.oemNumber,
            name: parts.name,
            status: parts.status,
            manufacturerId: parts.manufacturerId,
            categoryId: parts.categoryId,
            weightGrams: parts.weightGrams,
            createdAt: parts.createdAt,
            updatedAt: parts.updatedAt,
            manufacturerName: manufacturers.name,
            categoryName: categories.name,
          })
          .from(parts)
          .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
          .leftJoin(categories, eq(parts.categoryId, categories.id))
          .where(where)
          .orderBy(orderFn(sortCol))
          .limit(limit)
          .offset(offset),
        app.db.select({ total: count() }).from(parts).where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Get part by ID (full details with cross-references)
  app.get<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Parts"],
      summary: "Get part by ID with full details",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;

      const [part] = await app.db
        .select({
          id: parts.id,
          oemNumber: parts.oemNumber,
          name: parts.name,
          description: parts.description,
          specifications: parts.specifications,
          weightGrams: parts.weightGrams,
          dimensions: parts.dimensions,
          imageUrls: parts.imageUrls,
          status: parts.status,
          manufacturerId: parts.manufacturerId,
          categoryId: parts.categoryId,
          createdAt: parts.createdAt,
          updatedAt: parts.updatedAt,
          manufacturerName: manufacturers.name,
          manufacturerSlug: manufacturers.slug,
          categoryName: categories.name,
          categorySlug: categories.slug,
        })
        .from(parts)
        .leftJoin(manufacturers, eq(parts.manufacturerId, manufacturers.id))
        .leftJoin(categories, eq(parts.categoryId, categories.id))
        .where(eq(parts.id, id))
        .limit(1);

      if (!part) {
        return reply.code(404).send({ error: "Part not found" });
      }

      // Fetch cross-references
      const crossRefs = await app.db
        .select()
        .from(oemCrossReferences)
        .where(eq(oemCrossReferences.partId, id));

      return { ...part, crossReferences: crossRefs };
    },
  });

  // Create part
  app.post("/", {
    schema: {
      tags: ["Parts"],
      summary: "Create a new part",
      body: {
        type: "object",
        required: ["oemNumber", "manufacturerId", "name"],
        properties: {
          oemNumber: { type: "string" },
          manufacturerId: { type: "string", format: "uuid" },
          categoryId: { type: "string", format: "uuid", nullable: true },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          specifications: { type: "object", nullable: true },
          weightGrams: { type: "integer", nullable: true },
          dimensions: {
            type: "object",
            nullable: true,
            properties: {
              lengthMm: { type: "number" },
              widthMm: { type: "number" },
              heightMm: { type: "number" },
            },
          },
          imageUrls: { type: "array", items: { type: "string" }, nullable: true },
          status: {
            type: "string",
            enum: ["active", "discontinued", "pending"],
            default: "active",
          },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const body = createPartSchema.parse(request.body);
      const [created] = await app.db.insert(parts).values(body).returning();
      return reply.code(201).send(created);
    },
  });

  // Update part
  app.put<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Parts"],
      summary: "Update a part",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = updatePartSchema.parse(request.body);
      const [updated] = await app.db
        .update(parts)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(parts.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Part not found" });
      }
      return updated;
    },
  });

  // Delete part
  app.delete<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Parts"],
      summary: "Delete a part",
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
        .delete(parts)
        .where(eq(parts.id, id))
        .returning();

      if (!deleted) {
        return reply.code(404).send({ error: "Part not found" });
      }
      return reply.code(204).send();
    },
  });

  // OEM Cross References sub-routes
  // List cross-references for a part
  app.get<{ Params: { id: string } }>("/:id/cross-references", {
    schema: {
      tags: ["Parts"],
      summary: "List OEM cross-references for a part",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const { id } = request.params;
      const data = await app.db
        .select()
        .from(oemCrossReferences)
        .where(eq(oemCrossReferences.partId, id));
      return { data };
    },
  });

  // Add cross-reference to a part
  app.post<{ Params: { id: string } }>("/:id/cross-references", {
    schema: {
      tags: ["Parts"],
      summary: "Add OEM cross-reference to a part",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = createCrossRefSchema.parse(request.body);

      // Verify part exists
      const [part] = await app.db
        .select({ id: parts.id })
        .from(parts)
        .where(eq(parts.id, id))
        .limit(1);

      if (!part) {
        return reply.code(404).send({ error: "Part not found" });
      }

      const [created] = await app.db
        .insert(oemCrossReferences)
        .values({ ...body, partId: id })
        .returning();
      return reply.code(201).send(created);
    },
  });
};

export default partsRoutes;
