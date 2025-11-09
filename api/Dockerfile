# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for development)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript (for production)
RUN npm run build || true

# Note: Dev dependencies are kept for development mode
# In production, you can run: npm prune --production

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "start"]

