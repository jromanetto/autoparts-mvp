import fp from "fastify-plugin";
import { createDb, type Database } from "@autoparts/db";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

export default fp(
  async (app) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    const db = createDb(databaseUrl);
    app.decorate("db", db);
  },
  { name: "db" }
);
