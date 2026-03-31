import type { FastifyPluginAsync } from "fastify";
import { manufacturers } from "@autoparts/db";
import { eq, count, ilike, asc, desc } from "drizzle-orm";
import { z } from "zod";
import {
  paginationSchema,
  paginate,
  paginatedResponse,
} from "../lib/pagination.js";

const createManufacturerSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  country: z.string().max(100).nullish(),
  website: z.string().url().nullish(),
  logoUrl: z.string().url().nullish(),
});

const updateManufacturerSchema = createManufacturerSchema.partial();

const listQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  sort: z.enum(["name", "createdAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

const manufacturersRoutes: FastifyPluginAsync = async (app) => {
  // List manufacturers
  app.get("/", {
    schema: {
      tags: ["Manufacturers"],
      summary: "List manufacturers",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          search: { type: "string" },
          sort: { type: "string", enum: ["name", "createdAt"], default: "name" },
          order: { type: "string", enum: ["asc", "desc"], default: "asc" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = listQuerySchema.parse(request.query);
      const { limit, offset } = paginate(query);

      const where = query.search
        ? ilike(manufacturers.name, `%${query.search}%`)
        : undefined;

      const sortCol = query.sort === "createdAt" ? manufacturers.createdAt : manufacturers.name;
      const orderFn = query.order === "desc" ? desc : asc;

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select()
          .from(manufacturers)
          .where(where)
          .orderBy(orderFn(sortCol))
          .limit(limit)
          .offset(offset),
        app.db.select({ total: count() }).from(manufacturers).where(where),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Get manufacturer by ID
  app.get<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Manufacturers"],
      summary: "Get manufacturer by ID",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [manufacturer] = await app.db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.id, id))
        .limit(1);

      if (!manufacturer) {
        return reply.code(404).send({ error: "Manufacturer not found" });
      }
      return manufacturer;
    },
  });

  // Create manufacturer
  app.post("/", {
    schema: {
      tags: ["Manufacturers"],
      summary: "Create manufacturer",
      body: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          country: { type: "string", nullable: true },
          website: { type: "string", nullable: true },
          logoUrl: { type: "string", nullable: true },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const body = createManufacturerSchema.parse(request.body);
      const [created] = await app.db
        .insert(manufacturers)
        .values(body)
        .returning();
      return reply.code(201).send(created);
    },
  });

  // Update manufacturer
  app.put<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Manufacturers"],
      summary: "Update manufacturer",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = updateManufacturerSchema.parse(request.body);
      const [updated] = await app.db
        .update(manufacturers)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(manufacturers.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Manufacturer not found" });
      }
      return updated;
    },
  });

  // Delete manufacturer
  app.delete<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Manufacturers"],
      summary: "Delete manufacturer",
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
        .delete(manufacturers)
        .where(eq(manufacturers.id, id))
        .returning();

      if (!deleted) {
        return reply.code(404).send({ error: "Manufacturer not found" });
      }
      return reply.code(204).send();
    },
  });
};

export default manufacturersRoutes;
