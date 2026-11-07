// Datos para las pantallas del panel administrativo (según el prototipo de Figma).
const express = require('express');
const pool = require('../db');
const { requiere } = require('../servicios/sesion');

const router = express.Router();
const auth = requiere('admin');
// Estados que cuentan como venta confirmada
const VENTA = "('pagado','en_proceso','enviado','entregado')";

// Indicadores del dashboard, ventas por semana, productos más vistos y pedidos recientes
router.get('/admin/resumen', auth, async (req, res, next) => {
  try {
    const kpi = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM pedido WHERE date_trunc('month', fecha_pedido) = date_trunc('month', NOW())) AS pedidos_mes,
        (SELECT COALESCE(SUM(total),0)::float8 FROM pedido
          WHERE date_trunc('month', fecha_pedido) = date_trunc('month', NOW()) AND estado IN ${VENTA}) AS ventas_mes,
        (SELECT COUNT(*)::int FROM producto WHERE estado = 'activo') AS productos_activos,
        (SELECT COUNT(*)::int FROM variante_producto v JOIN producto p ON p.id_producto = v.id_producto
          WHERE v.stock <= 3 AND p.estado = 'activo') AS stock_bajo`);

    const semanas = await pool.query(`
      SELECT to_char(s, 'DD/MM') AS semana, valor FROM (
        SELECT date_trunc('week', fecha_pedido) AS s, SUM(total)::float8 AS valor
          FROM pedido
         WHERE fecha_pedido >= date_trunc('week', NOW()) - INTERVAL '5 weeks' AND estado IN ${VENTA}
         GROUP BY 1) t
       ORDER BY s`);

    const vistos = await pool.query(`
      SELECT p.nombre, COUNT(i.id_interaccion)::int AS vistas
        FROM interaccion_producto i JOIN producto p ON p.id_producto = i.id_producto
       WHERE i.tipo = 'visualizacion'
       GROUP BY p.nombre ORDER BY vistas DESC LIMIT 5`);

    const recientes = await pool.query(`
      SELECT p.id_pedido AS id, to_char(p.fecha_pedido, 'DD/MM/YYYY') AS fecha, c.nombre AS cliente,
             p.total::float8 AS total, p.medio_pago, p.estado
        FROM pedido p JOIN cliente c ON c.id_cliente = p.id_cliente
       ORDER BY p.fecha_pedido DESC LIMIT 5`);

    res.json({ kpi: kpi.rows[0], ventas_semana: semanas.rows, mas_vistos: vistos.rows, pedidos_recientes: recientes.rows });
  } catch (err) { next(err); }
});

// Productos con su categoría, stock total y proveedores
router.get('/admin/productos', auth, async (req, res, next) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : null;
    const { rows } = await pool.query(`
      SELECT p.id_producto AS id, p.nombre, p.referencia, c.nombre AS categoria,
             p.precio_base::float8 AS precio, p.estado,
             (SELECT COUNT(*)::int FROM variante_producto v WHERE v.id_producto = p.id_producto) AS variantes,
             (SELECT COALESCE(SUM(v.stock),0)::int FROM variante_producto v WHERE v.id_producto = p.id_producto) AS stock,
             (SELECT COALESCE(STRING_AGG(pr.nombre, ', '), '') FROM producto_proveedor pp
                JOIN proveedor pr ON pr.id_proveedor = pp.id_proveedor WHERE pp.id_producto = p.id_producto) AS proveedores
        FROM producto p JOIN categoria c ON c.id_categoria = p.id_categoria
       WHERE ($1::text IS NULL OR p.nombre ILIKE '%' || $1 || '%' OR p.referencia ILIKE '%' || $1 || '%')
       ORDER BY p.nombre`, [q]);
    res.json(rows);
  } catch (err) { next(err); }
});

// Activar o desactivar un producto
router.patch('/admin/productos/:id/estado', auth, async (req, res, next) => {
  try {
    const estado = String(req.body.estado || '');
    if (!['activo', 'inactivo'].includes(estado)) return res.status(400).json({ error: 'Estado no válido' });
    const { rows } = await pool.query(
      'UPDATE producto SET estado = $2 WHERE id_producto = $1 RETURNING id_producto AS id, estado',
      [Number.parseInt(req.params.id, 10), estado]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/admin/categorias', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id_categoria AS id, c.nombre, c.descripcion,
             (SELECT COUNT(*)::int FROM producto p WHERE p.id_categoria = c.id_categoria) AS productos
        FROM categoria c ORDER BY c.nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/admin/proveedores', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT pr.id_proveedor AS id, pr.nombre, pr.contacto, pr.telefono, pr.correo, pr.estado,
             (SELECT COUNT(*)::int FROM producto_proveedor pp WHERE pp.id_proveedor = pr.id_proveedor) AS productos
        FROM proveedor pr ORDER BY pr.nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/admin/clientes', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id_cliente AS id, c.nombre, c.correo, c.telefono, c.estado, c.fecha_registro,
             (SELECT COUNT(*)::int FROM pedido p WHERE p.id_cliente = c.id_cliente) AS pedidos,
             (SELECT COALESCE(SUM(p.total),0)::float8 FROM pedido p
               WHERE p.id_cliente = c.id_cliente AND p.estado IN ${VENTA}) AS total_comprado
        FROM cliente c ORDER BY c.fecha_registro DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

// Reporte de los últimos días: pedidos y valor por día, y totales por medio de pago
router.get('/admin/reportes', auth, async (req, res, next) => {
  try {
    const dias = Math.min(Math.max(Number.parseInt(req.query.dias || 30, 10), 1), 365);
    const porDia = await pool.query(`
      SELECT to_char(d, 'DD/MM') AS dia, pedidos, valor FROM (
        SELECT date_trunc('day', fecha_pedido) AS d, COUNT(*)::int AS pedidos, SUM(total)::float8 AS valor
          FROM pedido
         WHERE fecha_pedido >= NOW() - ($1::int * INTERVAL '1 day') AND estado IN ${VENTA}
         GROUP BY 1) t
       ORDER BY d`, [dias]);
    const porMedio = await pool.query(`
      SELECT medio_pago, COUNT(*)::int AS pedidos, SUM(total)::float8 AS valor
        FROM pedido WHERE estado IN ${VENTA} GROUP BY medio_pago ORDER BY medio_pago`);
    const totales = await pool.query(`
      SELECT COUNT(*)::int AS pedidos, COALESCE(SUM(total),0)::float8 AS valor
        FROM pedido WHERE estado IN ${VENTA}`);
    res.json({ dias, por_dia: porDia.rows, por_medio: porMedio.rows, totales: totales.rows[0] });
  } catch (err) { next(err); }
});

router.get('/admin/usuarios', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id_usuario AS id, u.nombre, u.correo, r.nombre AS rol, u.estado, u.fecha_creacion
        FROM usuario_administrativo u JOIN rol r ON r.id_rol = u.id_rol ORDER BY u.nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
