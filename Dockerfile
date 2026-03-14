# ══════════════════════════════════════════════════════════════════════════════
# DOCKERFILE - PostsAPI NestJS
# Build multi-etapa para imagen de producción optimizada (~150MB vs ~1GB)
# ══════════════════════════════════════════════════════════════════════════════

# ─── ETAPA 1: BUILD ───────────────────────────────────────────────────────────
# Instala dependencias y compila TypeScript → JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias primero (mejor cache de Docker)
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# ─── ETAPA 2: PRODUCCIÓN ──────────────────────────────────────────────────────
# Imagen limpia solo con lo necesario para ejecutar
FROM node:20-alpine AS production

WORKDIR /app

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar package.json para instalar solo dependencias de producción
COPY package*.json ./

# Instalar SOLO dependencias de producción (sin devDependencies)
RUN npm ci --omit=dev && npm cache clean --force

# Copiar código compilado desde la etapa builder
COPY --from=builder /app/dist ./dist

# Cambiar a usuario no-root
USER nestjs

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Exponer puerto
EXPOSE 3000

# Health check para que Docker/orquestadores sepan si está vivo
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/ping || exit 1

# Comando de inicio
CMD ["node", "dist/main.js"]
