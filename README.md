# Modulo web para la gestion y automatizacion de requerimientos

Modulo desarrollado como **Fase 3 (Objetivo secundario 3)** del trabajo de grado
*"Desarrollo de un modulo web para la gestion y automatizacion de requerimientos
de proyectos de software"* para **Dexter LATAM SAS**.

Centraliza el registro, la clasificacion, la priorizacion, la asignacion, el
flujo de estados, la trazabilidad (historial) y el seguimiento (listado y
tablero Kanban) de los requerimientos de los clientes, resolviendo la dispersion
de informacion identificada en la Fase 1.

Implementa los requerimientos funcionales **RF-01 a RF-14**, los no funcionales
**RNF-01 a RNF-09** y las reglas de negocio **RN-01 a RN-12** definidas en las
Fases 1 y 2 del documento.

## Aplicacion en linea

El modulo esta desplegado y disponible para evaluacion en:

**https://reqirer-production.up.railway.app/**

El codigo fuente esta disponible en el repositorio:

**https://github.com/AndresTorresCode/reqirer**

El acceso se realiza con las cuentas de demostracion (ver seccion *Usuarios de
demostracion*), todas con la contrasena `Dexter2026*`.

## Arquitectura

Aplicacion web de tres capas, segun lo propuesto en el objetivo principal:

| Capa            | Tecnologia                         | Carpeta     |
|-----------------|------------------------------------|-------------|
| Interfaz (UI)   | React 18 + Vite + React Router     | `frontend/` |
| Logica/servidor | Node.js + Express (API REST)       | `backend/`  |
| Almacenamiento  | PostgreSQL 16                      | `backend/src/db/` |

La separacion interfaz / logica / datos responde al RNF-05 (mantenibilidad).

```
modulo-requerimientos/
├── Dockerfile          imagen multi-stage para el deploy (frontend + backend)
├── .dockerignore       exclusiones del contexto de build de Docker
├── package.json        orquestador de build/arranque (uso local / Nixpacks)
├── railway.json        configuracion de despliegue en Railway (builder Docker)
├── backend/            API REST, reglas de negocio y acceso a datos
│   ├── src/
│   │   ├── config/     configuracion y pool de PostgreSQL
│   │   ├── db/         esquema (schema.sql), inicializacion y semilla
│   │   ├── middlewares/autenticacion, autorizacion y manejo de errores
│   │   ├── services/   logica de negocio (requerimientos, sugerencia, etc.)
│   │   ├── controllers/adaptadores HTTP
│   │   └── routes/     definicion de endpoints
│   └── tests/          pruebas de integracion y funcionales (Jest + Supertest)
├── frontend/           aplicacion React (5 pantallas + login)
└── docs/               manual basico de uso
```

## Requisitos previos

- Node.js 18 o superior (probado con Node 22)
- npm 9 o superior
- PostgreSQL 16 (local o en contenedor Docker)

## Puesta en marcha

### 1. Base de datos (PostgreSQL)

Opcion A - Docker (recomendada para desarrollo):

```bash
docker run -d --name dexter-pg \
  -e POSTGRES_USER=dexter \
  -e POSTGRES_PASSWORD=dexter_dev_2026 \
  -e POSTGRES_DB=dexter_requerimientos \
  -p 5432:5432 postgres:16-alpine
```

Opcion B - PostgreSQL instalado localmente: cree la base `dexter_requerimientos`
y un usuario con permisos, y ajuste las credenciales en `backend/.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env        # ajuste credenciales si es necesario
npm install
npm run db:reset            # aplica el esquema y carga datos de demostracion
npm start                   # API en http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # interfaz en http://localhost:5173
```

Abra `http://localhost:5173` en el navegador.

## Usuarios de demostracion

Todos comparten la contrasena **`Dexter2026*`**.

| Correo                      | Rol(es)                                   |
|-----------------------------|-------------------------------------------|
| andres@dexterlatam.com      | registrador, lider, desarrollador, validador |
| jessica@dexterlatam.com     | registrador                               |
| lider@dexterlatam.com       | lider                                     |
| dev@dexterlatam.com         | desarrollador                             |
| qa@dexterlatam.com          | validador                                 |

## Pruebas

```bash
cd backend
npm test
```

Ejecuta la suite de Jest + Supertest sobre una base de datos de pruebas
independiente (`dexter_requerimientos_test`), que se crea y siembra de forma
automatica. Cubre autenticacion, roles, registro, sugerencia automatica,
maquina de estados, reglas de negocio y trazabilidad.

## Variables de entorno (backend/.env)

| Variable        | Descripcion                                    |
|-----------------|------------------------------------------------|
| `PORT`          | Puerto del API (por defecto 4000)              |
| `NODE_ENV`      | `development` \| `production` \| `test`        |
| `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` | Conexion a PostgreSQL (local) |
| `PGDATABASE_TEST` | Base de datos usada por las pruebas          |
| `DATABASE_URL`  | Cadena de conexion unica (Railway/produccion). Si esta presente, tiene prioridad sobre las variables `PG*` |
| `PGSSL`         | `require`/`disable`. Por defecto SSL activo cuando hay `DATABASE_URL` |
| `JWT_SECRET`    | Clave para firmar los tokens JWT (RNF-09)      |
| `JWT_EXPIRES_IN`| Vigencia del token (por defecto 8h)            |
| `CORS_ORIGIN`   | Origen permitido del frontend                  |
| `SERVE_CLIENT`  | `true`/`false`. Servir el frontend compilado desde Express (por defecto activo salvo en pruebas) |
| `CLIENT_DIST_PATH` | Ruta alternativa del build del frontend (opcional) |

> Nota de seguridad: el archivo `.env` incluido usa credenciales de desarrollo.
> En un despliegue real deben cambiarse `JWT_SECRET` y la contrasena de la base
> de datos, y no versionar el archivo `.env`.

## Despliegue en produccion (Railway)

El modulo se despliega como **un solo servicio**: el servidor Express expone la
API REST en `/api` y, ademas, **sirve el frontend de React ya compilado**
(`frontend/dist`). Asi el frontend y el backend comparten el mismo dominio y no
hace falta configurar CORS ni una URL de API separada.

Archivos que habilitan el despliegue (en la raiz de `modulo-requerimientos/`):

- `Dockerfile` — imagen multi-stage: compila el frontend (Vite) y arma un
  runtime con solo las dependencias de produccion del backend + el `dist`. La
  imagen final **no contiene devDependencies** (jest, vite, esbuild).
- `.dockerignore` — excluye `node_modules`, `.env`, `dist` y metadatos del
  contexto de build.
- `railway.json` — usa el builder `DOCKERFILE` y define el *healthcheck* en
  `/api/health`.
- `package.json` (raiz) — orquestador para uso local (`npm run build`,
  `npm run db:setup`) y fallback para el builder Nixpacks si se quitara el
  Dockerfile.

### Pasos

1. **Subir el codigo a un repositorio** (GitHub/GitLab). Conviene que la raiz del
   repositorio sea la carpeta `modulo-requerimientos/`. Si el repositorio
   contiene mas cosas, configure en Railway el **Root Directory** =
   `entrega-final/modulo-requerimientos` (o donde quede el modulo).

2. **Crear el proyecto en Railway** y añadir una base de datos **PostgreSQL**
   (New → Database → PostgreSQL). Railway expone automaticamente la variable
   `DATABASE_URL` del servicio de Postgres.

3. **Crear el servicio del modulo** desde el repositorio. Railway detecta el
   `Dockerfile` (y `railway.json`) y construye la imagen:
   - Build: `docker build` (multi-stage, definido en el `Dockerfile`)
   - Start: `node src/server.js` (CMD de la imagen)
   - Healthcheck: `/api/health`

4. **Configurar las variables de entorno** del servicio (pestaña *Variables*):

   | Variable       | Valor                                            |
   |----------------|--------------------------------------------------|
   | `NODE_ENV`     | `production`                                     |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al plugin) |
   | `JWT_SECRET`   | una clave larga y aleatoria                      |
   | `SERVE_CLIENT` | `true`                                           |

   `PORT` lo inyecta Railway automaticamente; no hace falta definirlo.
   El SSL hacia Postgres se activa solo por tener `DATABASE_URL`.

5. **Inicializar el esquema (una sola vez).** La base de Railway ya existe, por
   lo que el codigo **omite** `CREATE DATABASE` y solo aplica el esquema. Desde
   el repositorio local, apuntando a la base de Railway, o desde una consola del
   servicio:

   ```bash
   # Con la DATABASE_URL publica de Railway (Connect → Postgres):
   DATABASE_URL="postgresql://..." npm run db:init    # solo el esquema
   DATABASE_URL="postgresql://..." npm run db:seed    # catalogos + datos demo (opcional)
   # o ambos:
   DATABASE_URL="postgresql://..." npm run db:setup
   ```

   > `db:init` recrea el esquema (borra datos). Ejecutelo solo en el montaje
   > inicial. La semilla (`db:seed`) carga catalogos y datos de demostracion;
   > para un entorno real puede sembrar solo los catalogos o cargar datos
   > propios.

6. **Abrir la URL publica** que asigna Railway. La aplicacion (login + 5
   pantallas) se sirve desde la raiz `/` y la API responde bajo `/api`.

### Comprobacion

- `GET https://<tu-app>.up.railway.app/api/health` → `{ "status": "ok" }`
- `GET https://<tu-app>.up.railway.app/` → carga la interfaz de React.

### Probar la imagen Docker en local (opcional)

```bash
# Desde la carpeta modulo-requerimientos/
docker build -t modulo-requerimientos .

# Ejecutar apuntando a una base PostgreSQL accesible.
# (DATABASE_URL tiene prioridad; con SSL local desactivado use PGSSL=disable)
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://dexter:dexter_dev_2026@host.docker.internal:5432/dexter_requerimientos" \
  -e PGSSL=disable \
  -e JWT_SECRET="clave-de-prueba" \
  modulo-requerimientos

# Comprobar: http://localhost:4000/  y  http://localhost:4000/api/health
```

> Nota de seguridad (dependencias): `npm audit` reporta 2 alertas (js-yaml y
> esbuild/vite) que provienen **unicamente de devDependencies** (Jest para las
> pruebas y Vite/esbuild para compilar). El arbol de **produccion** esta limpio
> (`npm audit --omit=dev` → 0 vulnerabilidades) y la imagen Docker **no incluye
> esas herramientas**, por lo que el artefacto desplegado no se ve afectado. Sus
> correcciones exigen cambios mayores rompedores (jest 25, vite 8) sin beneficio
> en tiempo de ejecucion, por lo que no se aplican.

> Nota de alcance: el modulo es un MVP verificado internamente (40/40 pruebas).
> Para un uso productivo intensivo conviene añadir, como trabajo futuro, pruebas
> de carga, limitacion de tasa de peticiones (rate limiting) y registro de
> auditoria, segun se documenta en la seccion 7.13 del trabajo de grado.

## Comandos utiles (backend)

| Comando             | Accion                                              |
|---------------------|-----------------------------------------------------|
| `npm run db:init`   | Aplica el esquema (`schema.sql`)                    |
| `npm run db:seed`   | Carga catalogos y datos de demostracion             |
| `npm run db:reset`  | Reinicia esquema + datos                            |
| `npm start`         | Inicia el API                                       |
| `npm run dev`       | Inicia el API con recarga automatica (nodemon)      |
| `npm test`          | Ejecuta las pruebas                                 |

## Documentacion adicional

- Manual basico de uso: [`docs/manual-de-uso.md`](docs/manual-de-uso.md)
