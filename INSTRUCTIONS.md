# Instrucciones para ejecutar el proyecto

## Requisitos previos

### Node.js

Este proyecto requiere **Node.js v22.14.0**. Se recomienda usar [nvm](https://github.com/nvm-sh/nvm) para gestionar versiones:

```bash
nvm install 22.14.0
nvm use 22.14.0
node -v   # debe mostrar v22.14.0
```

---

## 1. Instalar dependencias

```bash
npm install
```

---

## 2. Archivo de variables de entorno

El archivo `.env` se adjuntará en el correo. Una vez recibido, **pégalo en la raíz del proyecto** (`PostsAPI/.env`).

El archivo tiene la siguiente estructura:

```env
MONGODB_URI=<cadena de conexión a MongoDB>
JWT_SECRET=<secreto para firmar tokens JWT>
REDIS_URL=<cadena de conexión a Redis>
PORT=3000
NODE_ENV=development
```

> Si prefieres usar una base de datos MongoDB propia, reemplaza el valor de `MONGODB_URI` con tu cadena de conexión.

---

## 3. Ejecutar el proyecto

### Opción recomendada — Docker (sin necesidad de MongoDB ni Redis locales)

La forma más sencilla es levantar todo con Docker Compose, que incluye la API, MongoDB y Redis ya configurados:

```bash
npm run docker
```

Esto levantará los tres servicios. La API quedará disponible en:

```
http://localhost:3000

```

Para detener los contenedores:

```bash
npm run docker:down
```

### Opción alternativa — ejecución local

Si prefieres correr la API directamente sin Docker (requiere MongoDB y Redis propios configurados en el `.env`):

```bash
npm run start
```

---

## 4. Documentación interactiva (Swagger)

Con la API corriendo, accede a la documentación completa en:

```
http://localhost:3000/api
```

Desde ahí puedes explorar y probar todos los endpoints directamente en el navegador.

---

## 5. Importar colección en Postman

No se incluye un archivo de colección separado — se genera automáticamente desde Swagger:

1. Con la API corriendo, abre este enlace en el navegador:
   ```
   http://localhost:3000/api/json
   ```
2. Presiona **Ctrl + A** para seleccionar todo el JSON, luego **Ctrl + C** para copiarlo.
3. Abre **Postman** → **Import** → pestaña **Raw text** → pega el contenido → **Continue** → **Import**.
4. Postman generará automáticamente todos los endpoints organizados con sus schemas y ejemplos.

---

## 6. Probar los endpoints

### Paso 1 — Crear un usuario (sin autenticación)

El endpoint `POST /v1/users` está abierto para que puedas registrar un usuario de prueba:

```http
POST http://localhost:3000/v1/users
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Password123!",
  "role": "user"
}
```

### Paso 2 — Hacer login y obtener el JWT

```http
POST http://localhost:3000/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!"
}
```

La respuesta incluirá un `access_token`. Cópialo y úsalo como header `Authorization: Bearer <token>` en todas las demás peticiones.

### Paso 3 — Consumir Posts y Comments

Con el token obtenido ya puedes usar todos los endpoints:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/users` | Registrar usuario (público) |
| `GET` | `/v1/users` | Listar usuarios |
| `GET` | `/v1/users/:id` | Obtener un usuario |
| `PUT` | `/v1/users/:id` | Actualizar usuario |
| `GET` | `/v1/posts` | Listar todos los posts |
| `GET` | `/v1/posts/:id` | Obtener un post |
| `POST` | `/v1/posts` | Crear un post |
| `PUT` | `/v1/posts/:id` | Editar un post |
| `DELETE` | `/v1/posts/:id` | Eliminar un post |
| `POST` | `/v1/posts/bulk` | Carga masiva de posts |
| `GET` | `/v1/comments?postId={id}` | Comentarios de un post |
| `POST` | `/v1/comments` | Crear comentario |
| `DELETE` | `/v1/comments/:id` | Eliminar comentario |

### Carga masiva de posts

Para probar el endpoint de carga masiva, usa el archivo `bulk-posts-example.json` incluído en la raíz del proyecto (contiene 25 posts de ejemplo):

```http
POST http://localhost:3000/v1/posts/bulk
Authorization: Bearer <token>
Content-Type: application/json

[ ...contenido de bulk-posts-example.json... ]
```

---

## 7. Ejecutar los tests

### Correr todos los tests

```bash
npm run test:all
```

### Correr tests con reporte de cobertura

```bash
npm run test:testing:cov
```

Una vez finalizado, se generará la carpeta `coverage-testing/`. Abre el reporte visual en el navegador:

```
PostsAPI/coverage-testing/lcov-report/index.html
```

Verás el desglose completo de cobertura por archivo (statements, branches, functions, lines).

