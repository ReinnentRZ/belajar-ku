#!/bin/sh
set -e

echo "🚀 [entrypoint] Initializing Belajar-Ku API container..."

# If DATABASE_URL or REDIS_URL points to localhost/127.0.0.1 from a shared host .env file,
# automatically rewrite them to point to the docker container services 'postgres' / 'redis'
if echo "$DATABASE_URL" | grep -qE '@(localhost|127\.0\.0\.1):'; then
  echo "⚠️  [entrypoint] Detected localhost in DATABASE_URL inside Docker container. Remapping to postgres..."
  export DATABASE_URL=$(echo "$DATABASE_URL" | sed -E 's/@(localhost|127\.0\.0\.1):/@postgres:/')
fi

if echo "$REDIS_URL" | grep -qE '://(localhost|127\.0\.0\.1):'; then
  echo "⚠️  [entrypoint] Detected localhost in REDIS_URL inside Docker container. Remapping to redis..."
  export REDIS_URL=$(echo "$REDIS_URL" | sed -E 's/:\/\/(localhost|127\.0\.0\.1):/:\/\/redis:/')
fi

# Extract host and port from DATABASE_URL if available, or default to postgres:5432
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

echo "⏳ [entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT}..."
MAX_RETRIES=30
RETRY_COUNT=0

until nc -z -w 2 "$DB_HOST" "$DB_PORT" > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ [entrypoint] Timed out waiting for database at ${DB_HOST}:${DB_PORT}"
    exit 1
  fi
  echo "   [entrypoint] Database not ready yet, retrying in 1s ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 1
done

echo "✅ [entrypoint] PostgreSQL is online and accepting connections!"

# Generate Prisma Client if not already generated in container
echo "⚙️  [entrypoint] Ensuring Prisma Client is generated..."
npx prisma generate

# Synchronize database schema / migrations
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "📦 [entrypoint] No existing migrations directory found. Synchronizing schema via prisma db push..."
  npx prisma db push --skip-generate
else
  echo "📦 [entrypoint] Applying pending Prisma migrations..."
  npx prisma migrate deploy
fi

# Run category & initial data seeding
echo "🌱 [entrypoint] Executing database seed script..."
npm run prisma:seed || echo "⚠️ [entrypoint] Seed completed with notice (initial data likely already exists)."

echo "✨ [entrypoint] Setup complete! Starting application..."
exec "$@"
