# Cellmy · Sitio e-commerce (base del proyecto)

Base del sitio web de Cellmy Tecnología S.A.S. Incluye:

- Backend con Node.js, Express y PostgreSQL.
- Esquema de base de datos del modelo v2 (`db/schema.sql`) y datos de prueba (`db/seed.sql`).
- Catálogo con búsqueda, filtros y detalle de producto con variantes.
- Adaptadores simulados para Wompi, Addi y Siigo. Se reemplazan cuando lleguen las credenciales.

## 1. Lo que necesitas instalar

1. **Node.js 20 o superior:** https://nodejs.org (descarga la versión LTS).
2. **PostgreSQL 14 o superior:** https://www.postgresql.org/download/ (en Windows, el instalador incluye pgAdmin).
3. **Visual Studio Code (opcional, recomendado):** https://code.visualstudio.com

Para verificar la instalación, abre una terminal y escribe `node -v` y `psql --version`.

## 2. Abrir el proyecto

1. Descomprime `cellmy-ecommerce.zip` en una carpeta, por ejemplo `Documentos/cellmy-ecommerce`.
2. Abre Visual Studio Code, ve a **Archivo > Abrir carpeta** y elige la carpeta descomprimida.
3. Abre la terminal integrada en **Terminal > Nueva terminal**.

## 3. Instalar dependencias

En la terminal del proyecto:

```bash
npm install
```

## 4. Crear la base de datos

Crea una base llamada `cellmy` (con pgAdmin, o con la terminal):

```bash
createdb -U postgres cellmy
psql -U postgres -d cellmy -f db/schema.sql
psql -U postgres -d cellmy -f db/seed.sql
```

En Windows, si `createdb` no se reconoce, usa pgAdmin: clic derecho en *Databases > Create > Database*, nombre `cellmy`. Luego abre la herramienta de consulta y ejecuta el contenido de `db/schema.sql` y después el de `db/seed.sql`.

Si ya habías creado la base antes de esta versión, en lugar de volver a ejecutar `schema.sql` (que borra los datos) ejecuta solo la migración:

```bash
psql -U postgres -d cellmy -f db/migracion_descuentos.sql
```

En pgAdmin: abre el Query Tool sobre `cellmy`, carga `db/migracion_descuentos.sql` y ejecútalo con F5.

## 5. Configurar la conexión

Copia `.env.example` como `.env` y ajusta los valores:

```
DATABASE_URL=postgres://postgres:TU_CONTRASEÑA@localhost:5432/cellmy
PORT=3000
JWT_SECRET=una-clave-larga-y-secreta-que-solo-tu-conozcas
COSTO_ENVIO=18000
PAGO_MODO=simulado
```

`JWT_SECRET` firma las sesiones. Escribe una frase larga, sin espacios necesarios. Si falta, el servidor no arranca.

El archivo `.env` contiene información sensible. No lo subas a GitHub ni lo compartas.

## 6. Ejecutar el sitio

```bash
npm run dev
```

Abre el navegador en **http://localhost:3000**. Deberías ver el catálogo con los productos de prueba.

Para detenerlo, presiona `Ctrl + C` en la terminal.

## 6. Crear el usuario administrador

Con el servidor detenido, en la terminal:

```bash
node scripts/crear-admin.js correo@cellmy.com TuClave123 "Nombre del administrador"
```

La contraseña debe tener al menos 8 caracteres.

## Páginas

| Página | Para quién | Qué hace |
|---|---|---|
| `/` | Clientes | Catálogo con búsqueda y filtros |
| `/producto.html?id=1` | Clientes | Detalle, variantes y "Agregar al carrito" |
| `/login.html` | Clientes | Iniciar sesión o registrarse |
| `/carrito.html` | Clientes | Cambiar cantidades y quitar productos |
| `/checkout.html` | Clientes | Dirección, facturación, pago con Wompi o Addi |
| `/pedidos.html` | Clientes | Mis pedidos y su seguimiento |
| `/admin.html` | Administrador | Ver pedidos y avanzar su estado |

## Recorrido de un pedido

1. Pagado (al aprobar el pago).
2. En proceso (se genera la factura).
3. Enviado (se asigna la guía de Inter Rapidísimo).
4. Entregado.

El administrador solo puede avanzar en ese orden. Si intenta saltar una etapa, el sistema lo impide.

## Rutas disponibles

| Ruta | Qué devuelve |
|---|---|
| `/` | Catálogo (página web) |
| `/producto.html?id=1` | Detalle de un producto (página web) |
| `/api/salud` | Estado del servidor |
| `/api/categorias` | Lista de categorías |
| `/api/productos?q=galaxy&categoria=1&min=0&max=1000000&pagina=1` | Productos con búsqueda y filtros |
| `/api/productos/1` | Detalle de un producto con sus variantes |
| `POST /api/auth/registro` | Crear cuenta de cliente |
| `POST /api/auth/login` | Iniciar sesión de cliente |
| `GET/POST /api/cuenta/direcciones` | Direcciones del cliente |
| `GET /api/carrito` | Carrito con precios y stock |
| `POST /api/carrito/items` | Agregar un producto |
| `PUT /api/carrito/items/:id` | Cambiar cantidad (0 quita el producto) |
| `POST /api/pedidos` | Confirmar la compra (checkout) |
| `GET /api/pedidos` y `/api/pedidos/:id` | Pedidos del cliente y su seguimiento |
| `POST /api/admin/login` | Inicio de sesión del administrador |
| `GET /api/admin/pedidos` | Lista de pedidos (administrador) |
| `PATCH /api/admin/pedidos/:id/estado` | Cambiar estado del pedido (administrador) |

Cada visita al detalle de un producto registra una interacción (RF-29).

## Estructura

```
db/                 esquema y datos de prueba de PostgreSQL
src/
  server.js         arranque del servidor
  app.js            configuración de Express y rutas
  db.js             conexión a PostgreSQL
  rutas/            endpoints de la API (catálogo)
  servicios/        adaptadores de Wompi, Addi y Siigo (simulados)
public/             interfaz web (HTML, CSS y JavaScript)
```

## Pendiente

- Conexión real con Wompi, Addi y Siigo, cuando lleguen las credenciales. Hoy el pago es simulado.
- Notificaciones por correo al cambiar el estado del pedido.
- Subida de imágenes de producto desde el panel.
- Roles y permisos detallados. Hoy hay un solo tipo de administrador.
