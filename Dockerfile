# Use official lightweight Node.js 20/22/26 LTS image
FROM node:20-alpine AS builder

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
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files and assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose server port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
