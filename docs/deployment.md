# Deployment Guide — AutoParts API

## Architecture

```
Internet → Nginx (SSL termination) → Fastify API → PostgreSQL 16
                                         ↑
                                   Docker Compose
```

All services run on a single Hetzner Cloud VM using Docker Compose.

## Prerequisites

- Hetzner Cloud account
- Domain name with DNS pointing to the server IP
- SSH key pair

## 1. Provision Server

Create a **CX21** (2 vCPU, 4GB RAM) on Hetzner Cloud:
- Image: Ubuntu 24.04
- Location: Falkenstein (eu-central) or Nuremberg
- SSH key: add your public key

Once the VM is ready, run initial setup:

```bash
ssh root@<SERVER_IP> 'bash -s' < scripts/setup-server.sh
```

This installs Docker, creates a `deploy` user, configures UFW firewall (ports 22, 80, 443), and enables automatic security updates.

## 2. DNS

Point your domain to the server IP:

```
api.autoparts.example  A  <SERVER_IP>
```

Wait for DNS propagation before deploying (needed for Let's Encrypt).

## 3. Deploy

SSH into the server and clone/copy the repo:

```bash
ssh deploy@<SERVER_IP>
cd /opt/autoparts
# Copy project files (git clone, rsync, or scp)
```

Create the environment file:

```bash
cp docker/.env.staging.example docker/.env.staging
# Edit with real values:
# - DOMAIN: your actual domain
# - POSTGRES_PASSWORD: strong random password (openssl rand -hex 32)
# - API_KEYS: comma-separated API keys for clients (openssl rand -hex 32)
```

Run the deploy:

```bash
set -a && source docker/.env.staging && set +a
./scripts/deploy.sh
```

The script will:
1. Obtain an SSL certificate via Let's Encrypt (first run only)
2. Build the API Docker image
3. Run database migrations
4. Start all services (postgres, api, nginx, certbot)

## 4. Verify

```bash
# Health check
curl https://api.autoparts.example/health

# API docs
open https://api.autoparts.example/docs

# Test authenticated endpoint
curl -H "X-API-Key: YOUR_KEY" https://api.autoparts.example/api/v1/manufacturers
```

## Operations

### Redeploy (code update)

```bash
cd /opt/autoparts
git pull  # or rsync new code
set -a && source docker/.env.staging && set +a
./scripts/deploy.sh
```

### View logs

```bash
cd /opt/autoparts
docker compose -f docker/docker-compose.staging.yml logs -f api
docker compose -f docker/docker-compose.staging.yml logs -f nginx
```

### Run migrations only

```bash
docker compose -f docker/docker-compose.staging.yml --profile migrate run --rm migrate
```

### SSL certificate renewal

Certbot runs automatically every 12h via the certbot container. Manual renewal:

```bash
docker compose -f docker/docker-compose.staging.yml run --rm certbot certbot renew
docker compose -f docker/docker-compose.staging.yml exec nginx nginx -s reload
```

### Database backup

```bash
docker compose -f docker/docker-compose.staging.yml exec postgres \
  pg_dump -U autoparts autoparts | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restart services

```bash
docker compose -f docker/docker-compose.staging.yml restart api
docker compose -f docker/docker-compose.staging.yml restart nginx
```

## Monitoring

- **Health endpoint**: `GET /health` — returns `{"status":"ok","timestamp":"..."}`, no auth required
- **Uptime monitoring**: Point any uptime service (UptimeRobot, Hetrixtools) at `https://<DOMAIN>/health`
- **Docker health**: `docker compose -f docker/docker-compose.staging.yml ps` shows container health
- **Logs**: Docker logs via `docker compose logs`

## File Structure

```
docker/
  docker-compose.staging.yml   # Full staging stack
  Dockerfile.api               # Multi-stage API build
  Dockerfile.migrate           # DB migration runner
  .env.staging.example         # Template for env vars
  nginx/
    nginx.conf                 # Main nginx config
    conf.d/
      api.conf.template        # Server block (envsubst'd at startup)
scripts/
  setup-server.sh              # Initial VM provisioning
  deploy.sh                    # Deployment automation
```

## Security Notes

- PostgreSQL is only accessible within the Docker network (no exposed port)
- Nginx enforces HTTPS with HSTS
- API keys are required for all `/api/v1/*` endpoints
- Rate limiting at both Nginx (30 req/s) and Fastify (100 req/min) layers
- The `deploy` user runs Docker but has no root access
- UFW blocks all ports except 22, 80, 443
