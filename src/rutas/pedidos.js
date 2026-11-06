const express = require('express');
const pool = require('../db');
const { requiere } = require('../servicios/sesion');
const { crearTransaccionPago, solicitarFinanciacionAddi } = require('../servicios/integraciones');
const { confirmarPago } = require('../servicios/pagos_confirmacion');

const router = express.Router();
const auth = requiere('cliente');

const TIPOS_DOCUMENTO = ['Cédula de ciudadanía', 'Cédula de extranjería', 'NIT', 'Pasaporte'];
const MEDIOS = ['wompi', 'addi'];

// Checkout: crea el pedido a partir del carrito. Todo ocurre en una sola transacción.
router.post('/pedidos', auth, async (req, res, next) => {
  const db = await pool.connect();
  try {
    const { id_direccion, tipo_documento, numero_documento, medio_pago } = req.body || {};
    const idDireccion = Number.parseInt(id_direccion, 10);
    if (!Number.isInteger(idDireccion)) return res.status(400).json({ error: 'Selecciona una dirección de envío' });
    if (!TIPOS_DOCUMENTO.includes(tipo_documento)) return res.status(400).json({ error: 'Tipo de documento no válido' });
    if (!/^\d{5,15}$/.test(String(numero_documento || ''))) return res.status(400).json({ error: 'El número de documento debe tener solo dígitos' });
    if (!MEDIOS.includes(medio_pago)) return res.status(400).json({ error: 'Selecciona un medio de pago' });

    await db.query('BEGIN');

    const dir = await db.query('SELECT 1 FROM direccion_cliente WHERE id_direccion = $1 AND id_cliente = $2', [idDireccion, req.usuario.id]);
    if (!dir.rows.length) throw Object.assign(new Error(), { status: 400, mensaje: 'La dirección no pertenece a tu cuenta' });

    // Bloquea las variantes mientras se verifica el stock
    const items = await db.query(
      `SELECT i.id_variante, i.cantidad, v.stock, v.sku, (p.precio_base + v.precio_adicional) AS precio
         FROM item_carrito i
         JOIN carrito c ON c.id_carrito = i.id_carrito
         JOIN variante_producto v ON v.id_variante = i.id_variante
         JOIN producto p ON p.id_producto = v.id_producto
        WHERE c.id_cliente = $1
        FOR UPDATE OF v`,
      [req.usuario.id]
    );
    if (!items.rows.length) throw Object.assign(new Error(), { status: 400, mensaje: 'Tu carrito está vacío' });
    for (const it of items.rows) {
      if (it.stock < it.cantidad) {
        throw Object.assign(new Error(), { status: 409, mensaje: `Sin stock suficiente para ${it.sku}. Disponibles: ${it.stock}` });
      }
    }

    const subtotal = items.rows.reduce((suma, it) => suma + Number(it.precio) * it.cantidad, 0);
    const envio = Number(process.env.COSTO_ENVIO || 18000);
    const total = subtotal + envio;

    const pedido = await db.query(
      `INSERT INTO pedido (id_cliente, id_direccion, estado, subtotal, costo_envio, total, medio_pago,
                           tipo_documento_facturacion, numero_documento_facturacion)
       VALUES ($1, $2, 'pendiente', $3, $4, $5, $6, $7, $8) RETURNING id_pedido`,
      [req.usuario.id, idDireccion, subtotal, envio, total, medio_pago, tipo_documento, numero_documento]
    );
    const idPedido = pedido.rows[0].id_pedido;

    for (const it of items.rows) {
      await db.query(
        `INSERT INTO detalle_pedido (id_pedido, id_variante, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [idPedido, it.id_variante, it.cantidad, it.precio, Number(it.precio) * it.cantidad]
      );
    }

    const transaccion = crearTransaccionPago({ idPedido, monto: total });
    await db.query(
      'INSERT INTO pago (id_pedido, monto, estado, referencia_pasarela) VALUES ($1, $2, $3, $4)',
      [idPedido, total, 'pendiente', transaccion.referencia]
    );

    if (medio_pago === 'addi') {
      const financiacion = solicitarFinanciacionAddi({ idPedido, monto: total });
      await db.query(
        'INSERT INTO financiacion_addi (id_pedido, referencia_addi, estado) VALUES ($1, $2, $3)',
        [idPedido, financiacion.referencia, financiacion.estado]
      );
    }

    // Con PAGO_MODO=simulado el pago se aprueba al momento. Con Wompi real lo confirma el webhook.
    if (process.env.PAGO_MODO === 'simulado') {
      await confirmarPago(db, idPedido);
    }

    await db.query('COMMIT');
    const estado = await db.query('SELECT estado FROM pedido WHERE id_pedido = $1', [idPedido]);
    res.status(201).json({ id_pedido: idPedido, total, estado: estado.rows[0].estado });
  } catch (err) {
    await db.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.mensaje });
    next(err);
  } finally {
    db.release();
  }
});

// Pedidos del cliente en sesión
router.get('/pedidos', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id_pedido AS id, p.fecha_pedido, p.estado, p.total::float8 AS total, p.numero_guia,
              (SELECT COUNT(*)::int FROM detalle_pedido d WHERE d.id_pedido = p.id_pedido) AS items
         FROM pedido p WHERE p.id_cliente = $1 ORDER BY p.fecha_pedido DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Detalle de un pedido del cliente, con sus productos y el estado del pago
router.get('/pedidos/:id', auth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Pedido no válido' });
    const p = await pool.query(
      `SELECT p.id_pedido AS id, p.fecha_pedido, p.estado, p.subtotal::float8 AS subtotal,
              p.costo_envio::float8 AS envio, p.total::float8 AS total, p.medio_pago, p.numero_guia,
              d.direccion, d.ciudad, d.departamento,
              (SELECT estado FROM pago WHERE id_pedido = p.id_pedido ORDER BY id_pago DESC LIMIT 1) AS pago
         FROM pedido p JOIN direccion_cliente d ON d.id_direccion = p.id_direccion
        WHERE p.id_pedido = $1 AND p.id_cliente = $2`,
      [id, req.usuario.id]
    );
    if (!p.rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    const items = await pool.query(
      `SELECT pr.nombre, v.sku, v.color, v.capacidad_almacenamiento AS almacenamiento, v.tamano_pulgadas AS pulgadas,
              d.cantidad, d.precio_unitario::float8 AS precio, d.subtotal::float8 AS subtotal
         FROM detalle_pedido d
         JOIN variante_producto v ON v.id_variante = d.id_variante
         JOIN producto pr ON pr.id_producto = v.id_producto
        WHERE d.id_pedido = $1`,
      [id]
    );
    res.json({ ...p.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

module.exports = router;
