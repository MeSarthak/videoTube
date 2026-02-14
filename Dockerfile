# Use Debian-based Node image to allow ffmpeg installation
FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production

WORKDIR /app

# Install ffmpeg for video processing and Python for Whisper transcription
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       python3 \
       python3-pip \
       python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install OpenAI Whisper for transcription
# Using --break-system-packages for Debian 12+ compatibility
RUN pip3 install --no-cache-dir --break-system-packages openai-whisper

# Install dependencies separately to leverage Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Create temp directory for uploads
RUN mkdir -p /app/public/temp

EXPOSE 8000
CMD ["node", "src/index.js"]