const express = require('express');
const pool = require('../db');
const { requiere } = require('../servicios/sesion');

const router = express.Router();
const auth = requiere('cliente');

// Asegura que el cliente tenga carrito y devuelve su id
async function idCarrito(idCliente) {
  await pool.query('INSERT INTO carrito (id_cliente) VALUES ($1) ON CONFLICT (id_cliente) DO NOTHING', [idCliente]);
  const { rows } = await pool.query('SELECT id_carrito FROM carrito WHERE id_cliente = $1', [idCliente]);
  return rows[0].id_carrito;
}

// Contenido del carrito con precios y stock actuales
async function resumen(idCliente) {
  const { rows } = await pool.query(
    `SELECT v.id_variante AS id, p.nombre, v.sku, v.color, v.capacidad_almacenamiento AS almacenamiento,
            v.tamano_pulgadas AS pulgadas, (p.precio_base + v.precio_adicional)::float8 AS precio,
            v.stock, i.cantidad, ((p.precio_base + v.precio_adicional) * i.cantidad)::float8 AS subtotal
       FROM item_carrito i
       JOIN carrito c ON c.id_carrito = i.id_carrito
       JOIN variante_producto v ON v.id_variante = i.id_variante
       JOIN producto p ON p.id_producto = v.id_producto
      WHERE c.id_cliente = $1
      ORDER BY p.nombre, v.sku`,
    [idCliente]
  );
  const total = rows.reduce((suma, r) => suma + r.subtotal, 0);
  return { items: rows, total };
}

router.get('/carrito', auth, async (req, res, next) => {
  try { res.json(await resumen(req.usuario.id)); } catch (err) { next(err); }
});

// Agregar una variante (suma a la cantidad existente)
router.post('/carrito/items', auth, async (req, res, next) => {
  try {
    const idVariante = Number.parseInt(req.body.id_variante, 10);
    const cantidad = Number.parseInt(req.body.cantidad || 1, 10);
    if (!Number.isInteger(idVariante) || !Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ error: 'Variante o cantidad no válida' });
    }
    const v = await pool.query(
      `SELECT v.stock, p.estado FROM variante_producto v JOIN producto p ON p.id_producto = v.id_producto
        WHERE v.id_variante = $1`, [idVariante]);
    if (!v.rows.length || v.rows[0].estado !== 'activo') return res.status(404).json({ error: 'Producto no disponible' });

    const id = await idCarrito(req.usuario.id);
    const actual = await pool.query('SELECT cantidad FROM item_carrito WHERE id_carrito = $1 AND id_variante = $2', [id, idVariante]);
    const total = (actual.rows[0]?.cantidad || 0) + cantidad;
    if (total > v.rows[0].stock) return res.status(409).json({ error: `Solo hay ${v.rows[0].stock} unidades disponibles` });

    await pool.query(
      `INSERT INTO item_carrito (id_carrito, id_variante, cantidad) VALUES ($1, $2, $3)
       ON CONFLICT (id_carrito, id_variante) DO UPDATE SET cantidad = EXCLUDED.cantidad`,
      [id, idVariante, total]
    );
    await pool.query('UPDATE carrito SET fecha_actualizacion = NOW() WHERE id_carrito = $1', [id]);
    res.status(201).json(await resumen(req.usuario.id));
  } catch (err) { next(err); }
});

// Cambiar cantidad. Con 0 se quita el producto.
router.put('/carrito/items/:idVariante', auth, async (req, res, next) => {
  try {
    const idVariante = Number.parseInt(req.params.idVariante, 10);
    const cantidad = Number.parseInt(req.body.cantidad, 10);
    if (!Number.isInteger(idVariante) || !Number.isInteger(cantidad) || cantidad < 0) {
      return res.status(400).json({ error: 'Cantidad no válida' });
    }
    const id = await idCarrito(req.usuario.id);
    if (cantidad === 0) {
      await pool.query('DELETE FROM item_carrito WHERE id_carrito = $1 AND id_variante = $2', [id, idVariante]);
    } else {
      const v = await pool.query('SELECT stock FROM variante_producto WHERE id_variante = $1', [idVariante]);
      if (!v.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
      if (cantidad > v.rows[0].stock) return res.status(409).json({ error: `Solo hay ${v.rows[0].stock} unidades disponibles` });
      await pool.query(
        'UPDATE item_carrito SET cantidad = $3 WHERE id_carrito = $1 AND id_variante = $2',
        [id, idVariante, cantidad]
      );
    }
    res.json(await resumen(req.usuario.id));
  } catch (err) { next(err); }
});

module.exports = router;
