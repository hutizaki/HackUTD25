# Development Dockerfile (for docker-compose)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port 5173 (Vite dev server)
EXPOSE 5173

# Start dev server (can be overridden in docker-compose.yml)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

