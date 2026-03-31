import fp from "fastify-plugin";
import type { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export default fp(
  async (app) => {
    const apiKeys = new Set(
      (process.env.API_KEYS || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    );

    app.decorate(
      "authenticate",
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Skip auth if no API keys configured (development mode)
        if (apiKeys.size === 0) return;

        const key =
          request.headers["x-api-key"] ||
          request.headers.authorization?.replace("Bearer ", "");

        if (!key || !apiKeys.has(key as string)) {
          reply.code(401).send({ error: "Unauthorized", message: "Invalid or missing API key" });
        }
      }
    );
  },
  { name: "auth" }
);
