# Build stage
FROM node:22-alpine AS builder

# Install pnpm with specific version
RUN npm install -g pnpm@10.30.0

# Set working directory
WORKDIR /app

# Copy configuration and package files
COPY .npmrc .pnpmfile.cjs pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies with ignore-scripts to avoid build failures
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy frontend source
COPY packages/frontend ./packages/frontend

# Build the application
WORKDIR /app/packages/frontend
RUN pnpm build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
