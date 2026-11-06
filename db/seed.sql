-- Datos de prueba basados en los mockups y el panel administrativo.
-- Los precios son los de venta actuales. El descuento (-13%, etc.) no está modelado todavía.

INSERT INTO rol (nombre, descripcion) VALUES
  ('Administrador', 'Acceso completo al panel'),
  ('Representante legal', 'Consulta y reportes'),
  ('Administrador de local', 'Productos y pedidos');

INSERT INTO permiso (modulo, accion) VALUES
  ('productos', 'ver'), ('productos', 'editar'),
  ('categorias', 'ver'), ('categorias', 'editar'),
  ('proveedores', 'ver'), ('proveedores', 'editar'),
  ('pedidos', 'ver'), ('pedidos', 'editar'),
  ('clientes', 'ver'),
  ('reportes', 'ver'),
  ('usuarios', 'ver'), ('usuarios', 'editar');

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM rol r, permiso p WHERE r.nombre = 'Administrador';

INSERT INTO categoria (nombre, descripcion) VALUES
  ('Celulares', 'Equipos de telefonía móvil'),
  ('Televisores', 'Televisores de distintas pulgadas');

INSERT INTO proveedor (nombre, contacto, correo) VALUES
  ('Proveedor X', 'Por definir', 'ventas@proveedorx.com'),
  ('Proveedor Y', 'Por definir', 'ventas@proveedory.com'),
  ('Proveedor Z', 'Por definir', 'ventas@proveedorz.com');

INSERT INTO producto (id_categoria, nombre, marca, referencia, precio_base, estado)
SELECT id_categoria, 'Celular Galaxy A15 128GB', 'Samsung', 'SM-A155', 649900, 'activo'
  FROM categoria WHERE nombre = 'Celulares'
UNION ALL
SELECT id_categoria, 'Celular Redmi 12', 'Xiaomi', 'REDMI-12', 459900, 'activo'
  FROM categoria WHERE nombre = 'Celulares'
UNION ALL
SELECT id_categoria, 'Celular iPhone 12', 'Apple', 'IPHONE-12', 1299900, 'activo'
  FROM categoria WHERE nombre = 'Celulares'
UNION ALL
SELECT id_categoria, 'Celular Moto G54', 'Motorola', 'MOTO-G54', 589900, 'inactivo'
  FROM categoria WHERE nombre = 'Celulares'
UNION ALL
SELECT id_categoria, 'Televisor LED 43"', NULL, 'TV-LED-43', 1099900, 'activo'
  FROM categoria WHERE nombre = 'Televisores'
UNION ALL
SELECT id_categoria, 'Televisor Smart 50" 4K', NULL, 'TV-SMART-50', 1599900, 'activo'
  FROM categoria WHERE nombre = 'Televisores'
UNION ALL
SELECT id_categoria, 'Televisor 32" HD', NULL, 'TV-HD-32', 799900, 'activo'
  FROM categoria WHERE nombre = 'Televisores'
UNION ALL
SELECT id_categoria, 'Televisor 55" 4K', NULL, 'TV-4K-55', 2199900, 'activo'
  FROM categoria WHERE nombre = 'Televisores';

INSERT INTO variante_producto (id_producto, sku, color, capacidad_almacenamiento, tamano_pulgadas, precio_adicional, stock, codigo_siigo)
SELECT id_producto, 'CEL-A15-128-NG', 'Negro', '128 GB', NULL, 0, 23, 'CEL-A15-128-NG' FROM producto WHERE referencia = 'SM-A155'
UNION ALL SELECT id_producto, 'CEL-A15-128-AZ', 'Azul', '128 GB', NULL, 0, 8, 'CEL-A15-128-AZ' FROM producto WHERE referencia = 'SM-A155'
UNION ALL SELECT id_producto, 'CEL-A15-256-NG', 'Negro', '256 GB', NULL, 100000, 6, 'CEL-A15-256-NG' FROM producto WHERE referencia = 'SM-A155'
UNION ALL SELECT id_producto, 'CEL-RD12-128-AZ', 'Azul', '128 GB', NULL, 0, 15, 'CEL-RD12-128-AZ' FROM producto WHERE referencia = 'REDMI-12'
UNION ALL SELECT id_producto, 'CEL-IP12-128-NG', 'Negro', '128 GB', NULL, 0, 0, 'CEL-IP12-128-NG' FROM producto WHERE referencia = 'IPHONE-12'
UNION ALL SELECT id_producto, 'CEL-MG54-256-NG', 'Negro', '256 GB', NULL, 0, 9, 'CEL-MG54-256-NG' FROM producto WHERE referencia = 'MOTO-G54'
UNION ALL SELECT id_producto, 'TV-LED-43', NULL, NULL, '43"', 0, 8, 'TV-LED-43' FROM producto WHERE referencia = 'TV-LED-43'
UNION ALL SELECT id_producto, 'TV-SMART-50', NULL, NULL, '50"', 0, 12, 'TV-SMART-50' FROM producto WHERE referencia = 'TV-SMART-50'
UNION ALL SELECT id_producto, 'TV-HD-32', NULL, NULL, '32"', 0, 5, 'TV-HD-32' FROM producto WHERE referencia = 'TV-HD-32'
UNION ALL SELECT id_producto, 'TV-4K-55', NULL, NULL, '55"', 0, 4, 'TV-4K-55' FROM producto WHERE referencia = 'TV-4K-55';

INSERT INTO producto_proveedor (id_producto, id_proveedor)
SELECT p.id_producto, pr.id_proveedor FROM producto p, proveedor pr
 WHERE (p.referencia = 'SM-A155' AND pr.nombre = 'Proveedor X')
    OR (p.referencia = 'REDMI-12' AND pr.nombre = 'Proveedor Y')
    OR (p.referencia = 'IPHONE-12' AND pr.nombre = 'Proveedor X')
    OR (p.referencia LIKE 'TV-%' AND pr.nombre = 'Proveedor Z');

-- Precios anteriores de los productos en oferta (diseño de Figma)
UPDATE producto SET precio_anterior = 749900  WHERE referencia = 'SM-A155';
UPDATE producto SET precio_anterior = 519900  WHERE referencia = 'REDMI-12';
UPDATE producto SET precio_anterior = 1799900 WHERE referencia = 'TV-SMART-50';
UPDATE producto SET precio_anterior = 899900  WHERE referencia = 'TV-HD-32';
UPDATE producto SET precio_anterior = 2499900 WHERE referencia = 'TV-4K-55';
