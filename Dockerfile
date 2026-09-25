FROM node:20-bookworm-slim AS build
WORKDIR /app

ARG NEXT_PUBLIC_IDENTITY_API_URL=http://localhost:8001
ARG NEXT_PUBLIC_ACCOUNT_API_URL=http://localhost:8002
ARG NEXT_PUBLIC_LEDGER_API_URL=http://localhost:8003
ARG NEXT_PUBLIC_TRANSFER_API_URL=http://localhost:8004
ARG NEXT_PUBLIC_CARD_API_URL=http://localhost:8005
ARG NEXT_PUBLIC_FRAUD_API_URL=http://localhost:8006

ENV NEXT_PUBLIC_IDENTITY_API_URL=$NEXT_PUBLIC_IDENTITY_API_URL
ENV NEXT_PUBLIC_ACCOUNT_API_URL=$NEXT_PUBLIC_ACCOUNT_API_URL
ENV NEXT_PUBLIC_LEDGER_API_URL=$NEXT_PUBLIC_LEDGER_API_URL
ENV NEXT_PUBLIC_TRANSFER_API_URL=$NEXT_PUBLIC_TRANSFER_API_URL
ENV NEXT_PUBLIC_CARD_API_URL=$NEXT_PUBLIC_CARD_API_URL
ENV NEXT_PUBLIC_FRAUD_API_URL=$NEXT_PUBLIC_FRAUD_API_URL

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["npm", "start"]
