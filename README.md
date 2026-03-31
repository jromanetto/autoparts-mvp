# AutoParts

Europe's largest automotive spare parts database with superior web and API services.

## Tech Stack

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript
- **API**: Fastify
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Monorepo**: pnpm workspaces + Turborepo
- **Testing**: Vitest
- **CI/CD**: GitHub Actions

## Project Structure

```
autoparts/
├── apps/
│   └── api/              # Fastify API server
├── packages/
│   ├── db/               # Drizzle schema, migrations, client
│   ├── shared/           # Shared types, constants
│   └── scripts/          # Data import/export scripts
├── docker/
│   ├── Dockerfile.api
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
└── .github/workflows/    # CI pipeline
```

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm >= 9.15
- Docker (for PostgreSQL)

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose -f docker/docker-compose.dev.yml up -d

# Copy env file
cp .env.example .env

# Run migrations
pnpm run db:migrate

# Start dev server
pnpm run dev
```

### Common Commands

```bash
pnpm run build          # Build all packages
pnpm run dev            # Start dev server with hot reload
pnpm run test           # Run unit tests
pnpm run test:integration # Run integration tests
pnpm run lint           # Lint all packages
pnpm run typecheck      # Type-check all packages
pnpm run format         # Format with Prettier
pnpm run db:generate    # Generate Drizzle migrations
pnpm run db:migrate     # Run database migrations
```

## API Documentation

When the API is running, OpenAPI docs are available at `http://localhost:3000/docs`.
