# Use Node.js LTS with Alpine for smaller image size
FROM node:22-alpine AS builder

# Install FFmpeg and build dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++

# Install pnpm with specific version
RUN npm install -g pnpm@10.30.0

# Set working directory
WORKDIR /app

# Copy configuration and package files
COPY .npmrc ./
COPY package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source
COPY packages/backend ./packages/backend

# Build the application
WORKDIR /app/packages/backend
RUN pnpm build

# Production stage
FROM node:22-alpine

# Install FFmpeg (needed at runtime)
RUN apk add --no-cache ffmpeg

# Install pnpm with specific version
RUN npm install -g pnpm@10.30.0

WORKDIR /app

# Copy configuration and package files
COPY .npmrc ./
COPY package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Set working directory to backend
WORKDIR /app/packages/backend

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start:prod"]
