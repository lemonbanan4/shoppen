FROM node:20-slim

WORKDIR /app

# Native deps some npm packages fall back to compiling from source
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .
RUN npx medusa build

WORKDIR /app/.medusa/server
RUN npm install --no-audit --no-fund --legacy-peer-deps

ENV NODE_ENV=production
EXPOSE 9000

# Migrations run on every boot — safe and idempotent, keeps schema in sync
# whenever a new deploy adds/changes models.
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
