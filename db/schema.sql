-- Esquema de base de datos de Cellmy (modelo v2, documento de arquitectura).
-- ADVERTENCIA: elimina las tablas existentes. Úsalo en desarrollo.

DROP TABLE IF EXISTS financiacion_addi, factura_siigo, pago, detalle_pedido, pedido,
  item_carrito, carrito, direccion_cliente, cliente, interaccion_producto,
  producto_proveedor, proveedor, variante_producto, imagen_producto, producto, categoria,
  usuario_administrativo, rol_permiso, permiso, rol CASCADE;

CREATE TABLE rol (
  id_rol      SERIAL PRIMARY KEY,
  nombre      VARCHAR(60) NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE permiso (
  id_permiso SERIAL PRIMARY KEY,
  modulo     VARCHAR(60) NOT NULL,
  accion     VARCHAR(20) NOT NULL CHECK (accion IN ('ver', 'editar')),
  UNIQUE (modulo, accion)
);

CREATE TABLE rol_permiso (
  id_rol     INT NOT NULL REFERENCES rol(id_rol) ON DELETE CASCADE,
  id_permiso INT NOT NULL REFERENCES permiso(id_permiso) ON DELETE CASCADE,
  PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE usuario_administrativo (
  id_usuario     SERIAL PRIMARY KEY,
  id_rol         INT NOT NULL REFERENCES rol(id_rol),
  nombre         VARCHAR(120) NOT NULL,
  correo         VARCHAR(160) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE categoria (
  id_categoria SERIAL PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL UNIQUE,
  descripcion  TEXT
);

CREATE TABLE producto (
  id_producto    SERIAL PRIMARY KEY,
  id_categoria   INT NOT NULL REFERENCES categoria(id_categoria),
  nombre         VARCHAR(160) NOT NULL,
  marca          VARCHAR(80),
  referencia     VARCHAR(60) UNIQUE,
  descripcion    TEXT,
  precio_base    NUMERIC(12,2) NOT NULL CHECK (precio_base >= 0),
  precio_anterior NUMERIC(12,2),  -- precio antes de la oferta (se muestra tachado)
  estado         VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE imagen_producto (
  id_imagen   SERIAL PRIMARY KEY,
  id_producto INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  url         VARCHAR(300) NOT NULL,
  orden       INT NOT NULL DEFAULT 0,
  principal   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE variante_producto (
  id_variante            SERIAL PRIMARY KEY,
  id_producto            INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  sku                    VARCHAR(60) NOT NULL UNIQUE,
  color                  VARCHAR(40),
  capacidad_almacenamiento VARCHAR(20),
  tamano_pulgadas        VARCHAR(10),
  precio_adicional       NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock                  INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  codigo_siigo           VARCHAR(60)  -- debe coincidir con el código del producto en Siigo (RF-25)
);

CREATE TABLE proveedor (
  id_proveedor SERIAL PRIMARY KEY,
  nombre       VARCHAR(120) NOT NULL,
  contacto     VARCHAR(120),
  telefono     VARCHAR(30),
  correo       VARCHAR(160),
  estado       VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

CREATE TABLE producto_proveedor (
  id_producto INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  id_proveedor INT NOT NULL REFERENCES proveedor(id_proveedor) ON DELETE CASCADE,
  PRIMARY KEY (id_producto, id_proveedor)
);

CREATE TABLE interaccion_producto (
  id_interaccion BIGSERIAL PRIMARY KEY,
  id_producto    INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  id_cliente     INT,  -- se llena en la tabla cliente más adelante; NULL para visitantes
  tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('visualizacion', 'carrito', 'compra')),
  fecha          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cliente (
  id_cliente     SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  correo         VARCHAR(160) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  telefono       VARCHAR(30),
  estado         VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE interaccion_producto
  ADD CONSTRAINT fk_interaccion_cliente FOREIGN KEY (id_cliente)
  REFERENCES cliente(id_cliente) ON DELETE SET NULL;

CREATE TABLE direccion_cliente (
  id_direccion      SERIAL PRIMARY KEY,
  id_cliente        INT NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
  direccion         VARCHAR(200) NOT NULL,
  ciudad            VARCHAR(80) NOT NULL,
  departamento      VARCHAR(80) NOT NULL,
  telefono_contacto VARCHAR(30) NOT NULL,
  predeterminada    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE carrito (
  id_carrito          SERIAL PRIMARY KEY,
  id_cliente          INT NOT NULL UNIQUE REFERENCES cliente(id_cliente) ON DELETE CASCADE,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE item_carrito (
  id_item       SERIAL PRIMARY KEY,
  id_carrito    INT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
  id_variante   INT NOT NULL REFERENCES variante_producto(id_variante) ON DELETE CASCADE,
  cantidad      INT NOT NULL CHECK (cantidad > 0),
  UNIQUE (id_carrito, id_variante)
);

CREATE TABLE pedido (
  id_pedido                        SERIAL PRIMARY KEY,
  id_cliente                       INT NOT NULL REFERENCES cliente(id_cliente),
  id_direccion                     INT NOT NULL REFERENCES direccion_cliente(id_direccion),
  fecha_pedido                     TIMESTAMP NOT NULL DEFAULT NOW(),
  estado                           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                                   CHECK (estado IN ('pendiente', 'pagado', 'en_proceso', 'enviado', 'entregado', 'rechazado')),
  subtotal                         NUMERIC(12,2) NOT NULL,
  costo_envio                      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                            NUMERIC(12,2) NOT NULL,
  medio_pago                       VARCHAR(20) CHECK (medio_pago IN ('wompi', 'addi')),
  tipo_documento_facturacion       VARCHAR(30),
  numero_documento_facturacion     VARCHAR(20),  -- numérico, sin caracteres alfanuméricos
  numero_guia                      VARCHAR(40)
);

CREATE TABLE detalle_pedido (
  id_detalle      SERIAL PRIMARY KEY,
  id_pedido       INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  id_variante     INT NOT NULL REFERENCES variante_producto(id_variante),
  cantidad        INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL
);

CREATE TABLE pago (
  id_pago             SERIAL PRIMARY KEY,
  id_pedido           INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  monto               NUMERIC(12,2) NOT NULL,
  estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  referencia_pasarela VARCHAR(100) UNIQUE,  -- evita pagos duplicados (RNF-20)
  fecha_pago          TIMESTAMP
);

CREATE TABLE financiacion_addi (
  id_financiacion   SERIAL PRIMARY KEY,
  id_pedido         INT NOT NULL UNIQUE REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  referencia_addi   VARCHAR(100),
  estado            VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  fecha_solicitud   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE factura_siigo (
  id_factura     SERIAL PRIMARY KEY,
  id_pedido      INT NOT NULL UNIQUE REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  numero_factura VARCHAR(60),
  estado_envio   VARCHAR(30) NOT NULL DEFAULT 'pendiente_envio',
  fecha_envio    TIMESTAMP
);

CREATE INDEX idx_producto_categoria ON producto(id_categoria);
CREATE INDEX idx_variante_producto ON variante_producto(id_producto);
CREATE INDEX idx_pedido_cliente ON pedido(id_cliente);
