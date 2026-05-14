FROM node:22-alpine AS builder

WORKDIR /app

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY shared ./shared
COPY client ./client

# Accept as build args so they can be overridden per environment
ARG NEXT_PUBLIC_DEV_SERVER_URL=http://localhost
ARG NEXT_PUBLIC_DEV_ONBOARDING_SERVER_URL=http://localhost
ENV NEXT_PUBLIC_DEV_SERVER_URL=$NEXT_PUBLIC_DEV_SERVER_URL
ENV NEXT_PUBLIC_DEV_ONBOARDING_SERVER_URL=$NEXT_PUBLIC_DEV_ONBOARDING_SERVER_URL

RUN rm -rf client/.next && npm run build --prefix client

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production


COPY --from=builder /app/client/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/client/.next ./.next
COPY --from=builder /app/client/next.config.js ./

RUN mkdir -p ./public
COPY --from=builder /app/client/public ./public

# EXPOSE is just documentation, list all possible ports
EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]