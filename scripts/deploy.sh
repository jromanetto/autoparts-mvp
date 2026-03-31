#!/usr/bin/env bash
# Deploy AutoParts API to staging
# Usage: DOMAIN=api.autoparts.example POSTGRES_PASSWORD=xxx API_KEYS=key1,key2 ./scripts/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Required env vars
: "${DOMAIN:?Set DOMAIN (e.g. api.autoparts.example)}"
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
: "${API_KEYS:?Set API_KEYS (comma-separated)}"

COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.staging.yml"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "==> Deploying AutoParts API to $DOMAIN"

# Export for docker compose
export DOMAIN POSTGRES_PASSWORD API_KEYS

# Check if SSL cert exists, if not obtain one
if [ ! -d "$CERT_PATH" ]; then
    echo "==> Obtaining SSL certificate for $DOMAIN"

    # Start nginx temporarily for ACME challenge (HTTP only)
    # Create a minimal nginx config for initial cert
    TEMP_CONF="$PROJECT_DIR/docker/nginx/conf.d/temp-acme.conf"
    cat > "$TEMP_CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 444;
    }
}
NGINX

    # Start just nginx with temp config
    docker compose -f "$COMPOSE_FILE" up -d nginx
    sleep 3

    # Request certificate
    docker compose -f "$COMPOSE_FILE" run --rm certbot \
        certbot certonly --webroot -w /var/www/certbot \
        -d "$DOMAIN" \
        --email "admin@$DOMAIN" \
        --agree-tos \
        --no-eff-email

    # Remove temp config and stop nginx
    rm -f "$TEMP_CONF"
    docker compose -f "$COMPOSE_FILE" down
fi

echo "==> Building images"
docker compose -f "$COMPOSE_FILE" build api
docker compose -f "$COMPOSE_FILE" --profile migrate build migrate

echo "==> Starting postgres first"
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "==> Waiting for postgres..."
sleep 5

echo "==> Running database migrations"
docker compose -f "$COMPOSE_FILE" --profile migrate run --rm migrate

echo "==> Starting all services"
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Checking health"
if curl -sf "https://$DOMAIN/health" > /dev/null 2>&1; then
    echo "✓ API is healthy at https://$DOMAIN/health"
else
    echo "⚠ Health check failed. Checking containers..."
    docker compose -f "$COMPOSE_FILE" ps
    docker compose -f "$COMPOSE_FILE" logs --tail=20
    exit 1
fi

echo "==> Deployment complete"
echo "  API:  https://$DOMAIN/api/v1"
echo "  Docs: https://$DOMAIN/docs"
echo "  Health: https://$DOMAIN/health"
