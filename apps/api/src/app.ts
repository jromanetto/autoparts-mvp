import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import dbPlugin from "./plugins/db.js";
import authPlugin from "./plugins/auth.js";
import manufacturersRoutes from "./routes/manufacturers.js";
import categoriesRoutes from "./routes/categories.js";
import partsRoutes from "./routes/parts.js";
import vehiclesRoutes from "./routes/vehicles.js";
import searchRoutes from "./routes/search.js";
import compatibilityRoutes from "./routes/compatibility.js";

export async function buildApp(opts?: { skipDb?: boolean }) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // Security
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "*",
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // OpenAPI docs
  await app.register(swagger, {
    openapi: {
      info: {
        title: "AutoParts API",
        description:
          "Europe's largest automotive spare parts database API",
        version: "0.1.0",
      },
      servers: [
        {
          url: process.env.API_BASE_URL || "http://localhost:3000",
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "X-API-Key",
            in: "header",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // Health check (public, no auth)
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Database (skip in unit tests)
  if (!opts?.skipDb) {
    await app.register(dbPlugin);
  }

  // Authentication
  await app.register(authPlugin);

  // API routes (v1)
  await app.register(manufacturersRoutes, { prefix: "/api/v1/manufacturers" });
  await app.register(categoriesRoutes, { prefix: "/api/v1/categories" });
  await app.register(partsRoutes, { prefix: "/api/v1/parts" });
  await app.register(vehiclesRoutes, { prefix: "/api/v1/vehicles" });
  await app.register(searchRoutes, { prefix: "/api/v1/search" });
  await app.register(compatibilityRoutes, { prefix: "/api/v1/compatibility" });

  return app;
}
