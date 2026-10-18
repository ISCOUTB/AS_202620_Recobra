# Infraestructura como código (evidencia S8): imagen reproducible del
# backend NestJS. Build multi-stage para no llevar devDependencies ni
# TypeScript fuente a la imagen que corre en producción.

# App Flutter compilada para web y servida por la misma API en /app/
# (mismo origen: no necesita CORS ni una URL de API aparte).
FROM ghcr.io/cirruslabs/flutter:3.41.5 AS app-web
WORKDIR /mobile
COPY mobile/pubspec.yaml mobile/pubspec.lock ./
RUN flutter pub get
COPY mobile ./
RUN flutter build web --release --base-href /app/ --no-web-resources-cdn

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY public ./public
COPY --from=app-web /mobile/build/web ./public/app

# No correr como root (hallazgo SonarCloud docker:S6471): la imagen base
# node:alpine ya trae el usuario sin privilegios "node" (uid 1000).
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
