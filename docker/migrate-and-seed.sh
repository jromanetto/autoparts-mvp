#!/bin/sh
set -e

echo "Running database migrations..."
pnpm --filter @autoparts/db run db:migrate

echo "Checking if seed data is needed..."
# Only seed if manufacturers table is empty (first deploy)
RESULT=$(node -e "
const { createDb } = require('@autoparts/db');
const db = createDb(process.env.DATABASE_URL);
db.execute('SELECT count(*) as c FROM manufacturers').then(r => {
  console.log(r[0]?.c || '0');
  process.exit(0);
}).catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null || echo "0")

if [ "$RESULT" = "0" ]; then
  echo "Empty database detected — importing seed data..."
  pnpm --filter @autoparts/scripts run seed
else
  echo "Database already has data ($RESULT manufacturers), skipping seed."
fi

echo "Migration and seed complete."
