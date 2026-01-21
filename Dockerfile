# Use Debian-based Node image to allow ffmpeg installation
FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production

WORKDIR /app

# Install ffmpeg for video processing
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies separately to leverage Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

EXPOSE 8000
CMD ["node", "-r", "dotenv/config", "src/index.js"]
