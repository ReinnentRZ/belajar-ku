# ==========================================
# Stage 1: Base Alpine with libc6-compat
# ==========================================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

# ==========================================
# Stage 2: Install Dependencies
# ==========================================
FROM base AS dependencies

COPY package.json package-lock.json* ./

RUN npm install

# ==========================================
# Stage 3: Development Runtime (Hot-Reload)
# ==========================================
FROM base AS development

ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ==========================================
# Stage 4: Production Build
# ==========================================
FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN npm prune --omit=dev

# ==========================================
# Stage 5: Production Runtime
# ==========================================
FROM base AS production

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER node

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "run", "start"]
