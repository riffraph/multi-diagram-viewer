# Multi-stage build for the multi-diagram viewer

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

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
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create diagrams directory
RUN mkdir -p ./diagrams

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app
ENV DIAGRAMS_DIR=./diagrams

# Run the application
CMD ["python", "backend/main.py"] 