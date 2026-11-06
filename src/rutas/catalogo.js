const express = require('express');
const pool = require('../db');

const router = express.Router();

const entero = (valor) => (valor === undefined || valor === '' ? null : Number.parseInt(valor, 10));
const decimal = (valor) => (valor === undefined || valor === '' ? null : Number.parseFloat(valor));

// Categorías para el filtro del catálogo
router.get('/categorias', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id_categoria AS id, nombre FROM categoria ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Listado con búsqueda y filtros (RF-07 y RF-08)
router.get('/productos', async (req, res, next) => {
  try {
    const categoria = entero(req.query.categoria);
    const q = req.query.q ? String(req.query.q).trim() : null;
    const min = decimal(req.query.min);
    const max = decimal(req.query.max);
    const pagina = Math.max(entero(req.query.pagina) || 1, 1);
    const limite = Math.min(Math.max(entero(req.query.limite) || 12, 1), 50);

    const { rows } = await pool.query(
      `SELECT p.id_producto AS id,
              p.nombre,
              p.marca,
              p.referencia,
              p.precio_anterior::float8 AS precio_anterior,
              c.nombre AS categoria,
              (p.precio_base + COALESCE(MIN(v.precio_adicional), 0))::float8 AS precio_desde,
              COALESCE(SUM(v.stock), 0)::int AS stock_total,
              COUNT(*) OVER() AS total
         FROM producto p
         JOIN categoria c ON c.id_categoria = p.id_categoria
         LEFT JOIN variante_producto v ON v.id_producto = p.id_producto
        WHERE p.estado = 'activo'
          AND ($1::int IS NULL OR p.id_categoria = $1)
          AND ($2::text IS NULL OR p.nombre ILIKE '%' || $2 || '%'
                                OR p.referencia ILIKE '%' || $2 || '%'
                                OR p.marca ILIKE '%' || $2 || '%')
          AND ($3::numeric IS NULL OR p.precio_base >= $3)
          AND ($4::numeric IS NULL OR p.precio_base <= $4)
        GROUP BY p.id_producto, c.nombre
        ORDER BY p.nombre
        LIMIT $5 OFFSET $6`,
      [categoria, q, min, max, limite, (pagina - 1) * limite]
    );

    // Si la página pedida está vacía, total queda en 0. Un conteo separado lo corregiría.
    res.json({
      total: rows.length ? Number(rows[0].total) : 0,
      pagina,
      limite,
      productos: rows.map(({ total, ...producto }) => producto),
    });
  } catch (err) {
    next(err);
  }
});

// Detalle de producto con sus variantes. Registra la visualización (RF-29).
router.get('/productos/:id', async (req, res, next) => {
  try {
    const id = entero(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }

    const producto = await pool.query(
      `SELECT p.id_producto AS id,
              p.nombre,
              p.marca,
              p.referencia,
              p.descripcion,
              p.precio_base::float8 AS precio_base,
              p.precio_anterior::float8 AS precio_anterior,
              c.nombre AS categoria
         FROM producto p
         JOIN categoria c ON c.id_categoria = p.id_categoria
        WHERE p.id_producto = $1 AND p.estado = 'activo'`,
      [id]
    );
    if (!producto.rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const variantes = await pool.query(
      `SELECT v.id_variante AS id,
              v.sku,
              v.color,
              v.capacidad_almacenamiento AS almacenamiento,
              v.tamano_pulgadas AS pulgadas,
              v.stock,
              (p.precio_base + v.precio_adicional)::float8 AS precio
         FROM variante_producto v
         JOIN producto p ON p.id_producto = v.id_producto
        WHERE v.id_producto = $1
        ORDER BY v.sku`,
      [id]
    );

    await pool.query(
      "INSERT INTO interaccion_producto (id_producto, tipo) VALUES ($1, 'visualizacion')",
      [id]
    );

    res.json({ ...producto.rows[0], variantes: variantes.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
