FROM node:22-alpine

WORKDIR /app


COPY package*.json ./
RUN npm ci

# Copy source code (excluding client folder)
COPY server ./server
COPY shared ./shared
COPY tsconfig.json ./

# Documents which ports the container may listen on (does not publish them)
EXPOSE 3000 3001 3002 3003 3004 8080

CMD ["npx", "tsx", "--tsconfig", "server/tsconfig.json", "server/index.ts"]
