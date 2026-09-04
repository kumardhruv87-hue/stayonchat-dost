# Use official lightweight Node.js 22 LTS image (native WebSocket supported)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code and public assets
COPY src ./src
COPY public ./public

# Build TypeScript to dist
RUN npm run build

# Production runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled files and assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose server port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
