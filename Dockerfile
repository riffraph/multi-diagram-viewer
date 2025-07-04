# Multi-stage build for the multi-diagram viewer

# Stage 1: Build the frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Run the backend with the built frontend
FROM node:22-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies (including dev dependencies for TypeScript build)
WORKDIR /app/backend
RUN npm install

# Copy backend source code
COPY backend/src ./src/
COPY backend/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Create diagrams directory
RUN mkdir -p ./diagrams

# Expose port
EXPOSE 8000

# Set environment variables
ENV NODE_ENV=production
ENV DIAGRAMS_DIR=/app/diagrams

# Run the application from the app directory
WORKDIR /app
CMD ["node", "backend/dist/server.js"] 