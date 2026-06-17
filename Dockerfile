# =====================================================================
# Modulo de gestion de requerimientos - Dexter LATAM SAS (Fase 3)
# Imagen de un solo servicio para Railway:
#   - Express expone la API REST en /api
#   - y sirve el frontend de React ya compilado (mismo origen, sin CORS)
#
# Build multi-stage:
#   Stage 1 (frontend): compila el SPA con Vite -> dist
#   Stage 2 (runtime):  backend con solo dependencias de produccion + dist
# Resultado: la imagen final NO contiene devDependencies (jest, vite, esbuild),
# por lo que el artefacto desplegado queda libre de las alertas de npm audit
# que solo afectan a herramientas de desarrollo.
# =====================================================================

# ---------------------------------------------------------------------
# Stage 1 — Compilacion del frontend (React + Vite)
# ---------------------------------------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Instalar dependencias del frontend (incluye devDeps: Vite es necesario
# para compilar). Se copia primero el manifiesto para aprovechar la cache.
COPY frontend/package*.json ./
RUN npm ci

# Copiar el codigo fuente y compilar a /app/frontend/dist
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------
# Stage 2 — Runtime (backend Express que ademas sirve el SPA)
# ---------------------------------------------------------------------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production \
    SERVE_CLIENT=true

WORKDIR /app/backend

# Instalar SOLO dependencias de produccion del backend.
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el codigo del backend.
COPY backend/ ./

# Copiar el frontend ya compilado desde el stage 1.
# La ruta /app/frontend/dist coincide con clientDistPath de src/config/env.js
# (resuelve __dirname=/app/backend/src/config + ../../../frontend/dist).
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Asegurar que la aplicacion corre con un usuario sin privilegios.
RUN chown -R node:node /app
USER node

# Railway inyecta PORT en tiempo de ejecucion; el server lee process.env.PORT
# (por defecto 4000). EXPOSE es informativo.
EXPOSE 4000

# Healthcheck: usa node (siempre disponible) para no depender de curl/wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
