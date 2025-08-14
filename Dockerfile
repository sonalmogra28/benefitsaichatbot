# Dockerfile for Next.js Application
#
# This Dockerfile is optimized for production builds of a Next.js application,
# ensuring a small, secure, and efficient image for deployment on Google Cloud Run.

# --- Stage 1: Build ---
# This stage installs dependencies and builds the Next.js application.
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build the Next.js application for production
RUN pnpm build

# --- Stage 2: Production ---
# This stage creates the final, smaller production image.
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy production-necessary files from the build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public

# Set Node.js environment to production
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
# Using "next start" is the standard way to run a production Next.js app.
CMD ["npm", "start"]
