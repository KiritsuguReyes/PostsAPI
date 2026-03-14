# PostsAPI

API REST empresarial construida con NestJS, MongoDB y Redis. Diseñada para alto rendimiento, escalabilidad horizontal y concurrencia.

## Características principales

| Categoría | Tecnología | Descripción |
|-----------|------------|-------------|
| **Framework** | NestJS 11 | Arquitectura modular con inyección de dependencias |
| **Base de datos** | MongoDB + Mongoose | Connection pooling optimizado para alta carga |
| **Cache** | Redis + ioredis | Cache inteligente con invalidación por modificación |
| **Autenticación** | JWT + Passport | Tokens con expiración de 8 horas |
| **Rate Limiting** | @nestjs/throttler + Redis | 100 req/min global, 5 intentos/min en login |
| **Documentación** | Swagger/OpenAPI | UI interactiva en `/api` |
| **Versionado** | URI Versioning | `/v1/ruta` — soporte de múltiples versiones simultáneas |
| **Clustering** | Node.js cluster | 1 worker por CPU core en producción |
| **Contenedores** | Docker + Compose | API + MongoDB + Redis en un solo comando |

---

## Arquitectura del proyecto

```
src/
├── main.ts                          # Bootstrap + clustering
├── app.module.ts                    # Módulo raíz con configuración global
│
├── auth/                            # Autenticación
│   ├── auth.controller.ts           # POST /auth/login
│   ├── auth.service.ts              # Validación de credenciales + JWT
│   ├── dto/login.dto.ts             # Validación de entrada
│   ├── guards/jwt-auth.guard.ts     # Guard de rutas protegidas
│   └── strategies/jwt.strategy.ts   # Estrategia Passport JWT
│
├── posts/                           # CRUD de Posts
│   ├── posts.controller.ts          # Endpoints REST
│   ├── posts.service.ts             # Lógica de negocio + cache
│   ├── dto/                         # CreatePostDto, UpdatePostDto
│   └── schemas/post.schema.ts       # Schema Mongoose + índices
│
├── comments/                        # CRUD de Comentarios
│   ├── comments.controller.ts
│   ├── comments.service.ts
│   ├── dto/
│   └── schemas/comment.schema.ts
│
├── users/                           # Gestión de Usuarios
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/create-user.dto.ts
│   └── schemas/user.schema.ts       # Hash bcrypt + comparePassword
│
└── common/                          # Utilidades compartidas
    ├── cache/
    │   ├── redis-cache.module.ts    # Módulo global de cache
    │   └── redis-cache.service.ts   # getOrSet + invalidación inteligente
    ├── dto/pagination.dto.ts        # Paginación reutilizable
    ├── filters/global-exception.filter.ts
    ├── health/health.controller.ts  # /health con status de MongoDB + Redis
    ├── interceptors/logging.interceptor.ts
    ├── responses/api-response.ts    # Formato estandarizado
    └── utils/jwt-claims.util.ts     # Extracción de claims JWT
```

---

## Optimizaciones de Performance

### 1. Connection Pool de MongoDB

```typescript
// app.module.ts
MongooseModule.forRootAsync({
  useFactory: async () => ({
    uri: process.env.MONGODB_URI,
    maxPoolSize: 50,              // Máximo 50 conexiones concurrentes
    minPoolSize: 5,               // Mínimo 5 conexiones activas
    maxIdleTimeMS: 30000,         // 30s timeout para conexiones idle
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }),
})
```

### 2. Índices de texto compuesto

```typescript
// post.schema.ts
PostSchema.index({ title: 'text', body: 'text' });

// comment.schema.ts
CommentSchema.index({ name: 'text', body: 'text' });
```

Las búsquedas usan `$text: { $search }` en lugar de `$regex`, aprovechando los índices para complejidad O(log n) en lugar de O(n).

### 3. Consultas paralelas + proyección

```typescript
// posts.service.ts
const [data, total] = await Promise.all([
  this.postModel
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('title body author createdAt updatedAt')  // Solo campos necesarios
    .exec(),
  this.postModel.countDocuments(filter)
]);
```

### 4. Compresión de responses

```typescript
// main.ts
app.use(compression());
```

---

## Sistema de Cache con Redis

### Estrategia de doble invalidación

El cache combina dos mecanismos para máxima consistencia:

1. **TTL de 30 segundos**: Redis expira automáticamente las keys
2. **Invalidación por `lastModified`**: cuando hay una escritura, se actualiza `_lm:{collection}` y todos los GETs ven el cache como stale inmediatamente

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GET Request                                │
├─────────────────────────────────────────────────────────────────────┤
│  1. Obtiene rawCache + _lm:{collection} en paralelo                 │
│  2. ¿Cache existe?                                                  │
│     ├─ SÍ → ¿cachedAt > lastModified?                               │
│     │       ├─ SÍ → ✅ SIRVE DESDE CACHE (hit)                      │
│     │       └─ NO → ⚠️  STALE → refresca desde MongoDB              │
│     └─ NO → ❌ MISS → obtiene de MongoDB                            │
│  3. Guarda { data, cachedAt: Date.now() } con TTL 30s               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       POST/PUT/DELETE Request                       │
├─────────────────────────────────────────────────────────────────────┤
│  1. Ejecuta la operación en MongoDB                                 │
│  2. invalidateCollection():                                         │
│     ├─ touchLastModified("posts") → _lm:posts = Date.now()          │
│     └─ deletePattern("posts:*")  → SCAN-delete de keys de datos     │
│  3. El siguiente GET ve el dato fresco (sin esperar 30s)            │
└─────────────────────────────────────────────────────────────────────┘
```

### Keys en Redis

```
_lm:posts              ← timestamp de última modificación (TTL 1h)
_lm:comments           ← 
_lm:users              ←

posts:all:50           ← datos cacheados (TTL 30s)
posts:one:{id}         ←
posts:paginated:1:10:Angular::createdAt:desc
comments:by-post:{id}  ←
users:all:100000       ←
```

### Graceful degradation

Si Redis cae, **la API nunca se rompe** — todas las queries caen directo a MongoDB con un warning en el log.

---

## Rate Limiting Distribuido

### Configuración global

```typescript
// app.module.ts
ThrottlerModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    storage: new ThrottlerStorageRedisService(
      new Redis(configService.get<string>('REDIS_URL')),
    ),
    throttlers: [{
      ttl: 60000,   // 60 segundos
      limit: 100,   // 100 requests por minuto por IP
    }],
  }),
})
```

### Rate limit específico para login

```typescript
// auth.controller.ts
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 intentos/min
async login(@Body() loginDto: LoginDto) { ... }
```

### ¿Por qué Redis?

Con múltiples instancias (PM2 cluster, Kubernetes), cada worker comparte el mismo contador en Redis. Sin esto, cada instancia tendría su propio contador y el rate limiting no funcionaría.

```
                    ┌─ Worker 1 ─┐
Usuario ──────────► │            │ ◄──► Redis (contador único)
(150 requests)      ├─ Worker 2 ─┤      throttle:user:1.2.3.4 = 150
                    └─ Worker 3 ─┘      → BLOQUEADO a las 100
```

---

## Clustering en Producción

```typescript
// main.ts
if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  console.log(`Master ${process.pid} arrancando ${numCPUs} workers...`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.warn(`Worker ${worker.process.pid} terminó. Reiniciando...`);
    cluster.fork();  // Auto-restart
  });
} else {
  bootstrap();
}
```

- **Producción**: 1 worker por CPU core, el master solo supervisa
- **Desarrollo**: proceso único (debug más sencillo)
- **Auto-restart**: si un worker crashea, el master lo reinicia automáticamente

---

## Autenticación JWT

### Flujo de autenticación

```
1. POST /auth/login { email, password }
2. Validación contra MongoDB (bcrypt.compare)
3. Genera JWT con payload: { sub: id, email, name, role }
4. Respuesta: { access_token, user: { ... } }
5. Requests posteriores: Authorization: Bearer <token>
```

### Protección de rutas

```typescript
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController { ... }
```

### Extracción de claims (estilo C#)

```typescript
// En cualquier controller/service
const userId = JwtClaimsUtil.getUserId(request);
const email = JwtClaimsUtil.getUserEmail(request);
const role = JwtClaimsUtil.getUserRole(request);
```

---

## Versionado de API

La API usa **URI versioning**: la versión va en la URL (`/v1/ruta`). Esto permite añadir nuevas versiones sin romper integraciones existentes — los clientes que usan `v1` siguen funcionando aunque exista una `v2`.

### Versión actual: v1

Todos los endpoints tienen el prefijo `/v1/`:

```
GET  /v1/posts
POST /v1/auth/login
GET  /v1/health/ping
```

### Añadir una versión futura (v2)

Basta con crear un nuevo controller con `version: '2'` — `v1` sigue funcionando sin cambios:

```typescript
@Controller({ path: 'posts', version: '2' })
export class PostsV2Controller {
  // Nueva implementación sin afectar v1
}
```

---

## Docker

### Levantar con Docker (recomendado)

Un solo comando levanta **API + MongoDB + Redis** sin necesidad de configuración externa:

```bash
npm run docker
```

Esto ejecuta `docker-compose up -d` y arranca los 3 contenedores:

| Contenedor | Imagen | Puerto |
|------------|--------|--------|
| `posts-api` | NestJS (custom build) | `4202` → interno `3000` |
| `posts-mongo` | `mongo:7` | `27017` |
| `posts-redis` | `redis:7-alpine` | `6379` |

### Comandos Docker

```bash
# Levantar stack completo (mata proceso Node local si existe)
npm run docker

# Apagar todos los contenedores
npm run docker:down

# Apagar y borrar datos (MongoDB + Redis)
docker-compose down -v

# Reconstruir imagen después de cambios en el código
docker-compose up -d --build

# Ver logs de la API
docker logs posts-api -f

# Ver estado de los contenedores
docker-compose ps
```

### Correr en local (sin Docker)

```bash
# Proceso único con hot reload
npm run start:dev

# Proceso único sin hot reload
npm start
```

> **Nota:** Al correr en local, la app usa las variables del `.env` directamente. El MongoDB debe estar accesible en `localhost:27017` (puede ser el contenedor de Docker ejecutándose en paralelo, que expone ese puerto).

### Variables de entorno con Docker

Docker lee el `.env` del directorio raíz. Lo que controla cada variable:

| Variable en `.env` | Efecto en Docker |
|---|---|
| `PORT=4202` | Puerto externo del host (accedes por `localhost:4202`) |
| `JWT_SECRET=...` | Se pasa al contenedor ✅ |
| `NODE_ENV=...` | Se pasa al contenedor ✅ |
| `MONGODB_URI=...` | **Ignorada** — Docker usa el contenedor interno `mongo:27017` |
| `REDIS_URL=...` | **Ignorada** — Docker usa el contenedor interno `redis:6379` |

Para aplicar cambios en variables de entorno:
```bash
docker-compose up -d   # Basta para variables (sin --build)
```

---

## Health Check

```http
GET /v1/health
```

```json
{
  "success": true,
  "message": "Health check exitoso",
  "data": {
    "status": "ok",
    "timestamp": "2026-03-14T10:30:00.000Z",
    "uptime": 3600.5,
    "memory": {
      "rss": 45678912,
      "heapTotal": 25165824,
      "heapUsed": 18923456
    },
    "environment": "production",
    "database": {
      "status": "connected",
      "healthy": true
    },
    "cache": {
      "status": "connected",
      "healthy": true
    }
  }
}
```

---

## API Endpoints

> Todos los endpoints usan el prefijo `/v1/`. Swagger disponible en `http://localhost:4202/api`

### Auth

| Método | Endpoint | Descripción | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/v1/auth/login` | Iniciar sesión | 5/min |

### Posts (requiere JWT)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/v1/posts?limit=50` | Todos los posts (máx 100k) |
| `GET` | `/v1/posts/paginated?page=1&limit=10&search=Angular&author=Juan&sortBy=createdAt&sortOrder=desc` | Posts paginados con filtros |
| `GET` | `/v1/posts/:id` | Post por ID |
| `POST` | `/v1/posts` | Crear post |
| `POST` | `/v1/posts/bulk` | Carga masiva de posts |
| `PUT` | `/v1/posts/:id` | Actualizar post |
| `DELETE` | `/v1/posts/:id` | Eliminar post |

### Comments (requiere JWT)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/v1/comments/by-post?postId=xxx` | Comentarios de un post |
| `GET` | `/v1/comments/paginated?page=1&limit=10&postId=xxx&name=Juan` | Comentarios paginados |
| `GET` | `/v1/comments/:id` | Comentario por ID |
| `POST` | `/v1/comments` | Crear comentario |
| `PUT` | `/v1/comments/:id` | Actualizar comentario |
| `DELETE` | `/v1/comments/:id` | Eliminar comentario |

### Users

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/v1/users` | Registrar usuario | No |
| `GET` | `/v1/users?limit=50` | Listar usuarios (máx 100k) | Sí |
| `GET` | `/v1/users/:id` | Usuario por ID | Sí |

### Health

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/v1/health` | Health check completo |
| `GET` | `/v1/health/ping` | Ping básico |

---

## Formato de respuesta estandarizado

Todas las respuestas siguen el mismo formato:

```typescript
// Éxito
{
  "success": true,
  "message": "Operación exitosa",
  "timestamp": "2026-03-14T10:30:00.000Z",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Descripción del error",
  "timestamp": "2026-03-14T10:30:00.000Z",
  "error": {
    "statusCode": 400,
    "details": { ... }
  }
}
```

---

## Configuración


### Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env
# Editar .env con tus credenciales (JWT_SECRET, PORT)
```

### Ejecución con Docker (recomendado)

```bash
# Levantar API + MongoDB + Redis
npm run docker

# La API estará disponible en:
# http://localhost:4202/v1/...
# http://localhost:4202/api  (Swagger)
```

### Ejecución local

```bash
# Desarrollo con hot reload (detiene el contenedor API de Docker)
npm run start:dev

# Sin hot reload
npm start

# Producción (clustering automático)
NODE_ENV=production npm run start:prod

# Build
npm run build
```

---

## Swagger UI

Documentación interactiva disponible en `/api`:

```
http://localhost:4202/api
```

- Autenticación: click en "Authorize" → pegar token JWT
- Prueba de endpoints en vivo
- Descarga de especificación: `/api/json` o `/api/yaml`

---

## Logging

Todas las requests se loguean con información del usuario autenticado:

```
📥 GET /posts/paginated - IP: 192.168.1.1 - User: alvaro@test.com (65fd123...)
✅ GET /posts/paginated - 200 - 45ms - User: alvaro@test.com
🔐 Login attempt: alvaro@test.com - SUCCESS
❌ POST /posts - ERROR - 12ms - User: anonymous - Error: Unauthorized
```

---

## Stack tecnológico

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| @nestjs/core | ^11.0.0 | Framework |
| @nestjs/mongoose | ^11.0.0 | ODM MongoDB |
| @nestjs/jwt | ^11.0.0 | Tokens JWT |
| @nestjs/passport | ^11.0.0 | Autenticación |
| @nestjs/throttler | ^6.5.0 | Rate limiting |
| @nestjs/swagger | ^11.2.6 | Documentación |
| @nest-lab/throttler-storage-redis | ^1.2.0 | Rate limiting distribuido |
| ioredis | ^5.4.0 | Cliente Redis |
| bcrypt | ^6.0.0 | Hash de contraseñas |
| class-validator | ^0.14.1 | Validación de DTOs |
| compression | ^1.8.1 | Compresión gzip |

---

## Licencia

UNLICENSED - Proyecto privado