FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source code and public web assets
COPY src ./src
COPY public ./public

# Build TypeScript to dist
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]

