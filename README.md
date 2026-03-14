# PostsAPI

API REST empresarial construida con NestJS, MongoDB y Redis. Diseñada para alto rendimiento, escalabilidad horizontal y concurrencia.

## Características principales

| Categoría | Tecnología | Descripción |
|-----------|------------|-------------|
| **Framework** | NestJS 10 | Arquitectura modular con inyección de dependencias |
| **Base de datos** | MongoDB + Mongoose | Connection pooling optimizado para alta carga |
| **Cache** | Redis + ioredis | Cache inteligente con invalidación por modificación |
| **Autenticación** | JWT + Passport | Tokens con expiración de 8 horas |
| **Rate Limiting** | @nestjs/throttler + Redis | 100 req/min global, 5 intentos/min en login |
| **Documentación** | Swagger/OpenAPI | UI interactiva en `/api` |
| **Clustering** | Node.js cluster | 1 worker por CPU core en producción |

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

## Health Check

```http
GET /health
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

### Auth

| Método | Endpoint | Descripción | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/auth/login` | Iniciar sesión | 5/min |

### Posts (requiere JWT)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/posts?limit=50` | Todos los posts (máx 100k) |
| `GET` | `/posts/paginated?page=1&limit=10&search=Angular&author=Juan&sortBy=createdAt&sortOrder=desc` | Posts paginados con filtros |
| `GET` | `/posts/:id` | Post por ID |
| `POST` | `/posts` | Crear post |
| `POST` | `/posts/bulk` | Carga masiva de posts |
| `PUT` | `/posts/:id` | Actualizar post |
| `DELETE` | `/posts/:id` | Eliminar post |

### Comments (requiere JWT)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/comments/by-post?postId=xxx` | Comentarios de un post |
| `GET` | `/comments/paginated?page=1&limit=10&postId=xxx&name=Juan` | Comentarios paginados |
| `GET` | `/comments/:id` | Comentario por ID |
| `POST` | `/comments` | Crear comentario |
| `PUT` | `/comments/:id` | Actualizar comentario |
| `DELETE` | `/comments/:id` | Eliminar comentario |

### Users

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/users` | Registrar usuario | No |
| `GET` | `/users?limit=50` | Listar usuarios (máx 100k) | Sí |
| `GET` | `/users/:id` | Usuario por ID | Sí |

### Health

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Health check completo |
| `GET` | `/health/ping` | Ping básico |

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

# Editar .env con tus credenciales
```

### Ejecución

```bash
# Desarrollo (proceso único, hot reload)
npm run start:dev

# Producción (clustering automático)
NODE_ENV=production npm run start:prod

# Build
npm run build
```

---

## Swagger UI

Documentación interactiva disponible en `/api`:

```
http://localhost:port/api
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
| @nestjs/core | ^10.0.0 | Framework |
| @nestjs/mongoose | ^10.0.2 | ODM MongoDB |
| @nestjs/jwt | ^10.2.0 | Tokens JWT |
| @nestjs/passport | ^11.0.5 | Autenticación |
| @nestjs/throttler | ^6.5.0 | Rate limiting |
| @nestjs/swagger | ^11.2.6 | Documentación |
| @nest-lab/throttler-storage-redis | latest | Rate limiting distribuido |
| ioredis | latest | Cliente Redis |
| bcrypt | ^6.0.0 | Hash de contraseñas |
| class-validator | ^0.15.1 | Validación de DTOs |
| compression | ^1.8.1 | Compresión gzip |

---

## Licencia

UNLICENSED - Proyecto privado