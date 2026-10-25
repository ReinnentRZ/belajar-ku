# ==========================================
# Stage 1: Base Alpine Environment
# ==========================================
FROM node:20-alpine AS base

# Install OpenSSL and libc6-compat for Prisma & native binary compatibility
RUN apk add --no-cache openssl libc6-compat netcat-openbsd

WORKDIR /app

# ==========================================
# Stage 2: Install Dependencies
# ==========================================
FROM base AS dependencies

COPY package.json package-lock.json* ./

# Install all dependencies (development + production)
RUN npm install

# ==========================================
# Stage 3: Development Environment
# ==========================================
FROM base AS development

ENV NODE_ENV=development

# Copy installed node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.json ./

# Copy Prisma schema and generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and entrypoint
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ==========================================
# Stage 4: Build for Production
# ==========================================
FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

# Install production-only dependencies
RUN npm prune --omit=dev

# ==========================================
# Stage 5: Production Runtime
# ==========================================
FROM base AS production

ENV NODE_ENV=production

# Copy production node_modules, generated Prisma client, and compiled JavaScript
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
