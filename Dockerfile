FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy all source
COPY backend/ ./backend/
COPY frontend/ ./frontend/

EXPOSE 8080
ENV PORT=8080

CMD ["node", "backend/server.js"]
