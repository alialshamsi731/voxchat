# Stage 1: Build Frontend
FROM node:18-slim AS frontend-builder
RUN apt-get update && apt-get install -y openssl
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend & Production Image
FROM node:18-slim
RUN apt-get update && apt-get install -y openssl
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./

# Generate Prisma Client
RUN npx prisma generate

# Copy frontend build into standard location accessed by server.js
COPY --from=frontend-builder /app/client/dist /app/client/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
