# Infraestructura como código (evidencia S8): imagen reproducible del
# backend NestJS. Build multi-stage para no llevar devDependencies ni
# TypeScript fuente a la imagen que corre en producción.

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

# No correr como root (hallazgo SonarCloud docker:S6471): la imagen base
# node:alpine ya trae el usuario sin privilegios "node" (uid 1000).
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
