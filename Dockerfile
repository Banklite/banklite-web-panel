# Next.js usa un compilador nativo (SWC) que en la imagen "alpine" (musl libc)
# puede fallar con SIGBUS dentro de Docker Desktop en Windows. Usamos la imagen
# "bookworm-slim" (Debian, glibc) para evitar ese problema conocido.
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Estas dos variables se "hornean" dentro del JS del navegador en el momento
# del build (no se pueden cambiar despues en tiempo de ejecucion), por eso
# van como ARG + ENV aqui y no solo en docker-compose.
ARG NEXT_PUBLIC_IDENTITY_API_URL=http://localhost:8001
ARG NEXT_PUBLIC_ACCOUNT_API_URL=http://localhost:8002
ARG NEXT_PUBLIC_LEDGER_API_URL=http://localhost:8003
ARG NEXT_PUBLIC_TRANSFER_API_URL=http://localhost:8004
ENV NEXT_PUBLIC_IDENTITY_API_URL=$NEXT_PUBLIC_IDENTITY_API_URL
ENV NEXT_PUBLIC_ACCOUNT_API_URL=$NEXT_PUBLIC_ACCOUNT_API_URL
ENV NEXT_PUBLIC_LEDGER_API_URL=$NEXT_PUBLIC_LEDGER_API_URL
ENV NEXT_PUBLIC_TRANSFER_API_URL=$NEXT_PUBLIC_TRANSFER_API_URL

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
