const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { firmar, requiere } = require('../servicios/sesion');
const { emitirFacturaSiigo } = require('../servicios/integraciones');

const router = express.Router();

// Transiciones permitidas. Cada cambio sigue el recorrido real del pedido.
const TRANSICIONES = {
  pagado: ['en_proceso'],
  en_proceso: ['enviado'],
  enviado: ['entregado'],
};

// Inicio de sesión del personal administrativo
router.post('/admin/login', async (req, res, next) => {
  try {
    const { correo, password } = req.body || {};
    const { rows } = await pool.query(
      'SELECT id_usuario, nombre, correo, password_hash, estado FROM usuario_administrativo WHERE correo = $1',
      [String(correo || '').toLowerCase()]
    );
    const u = rows[0];
    if (!u || !(await bcrypt.compare(String(password || ''), u.password_hash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    if (u.estado !== 'activo') return res.status(403).json({ error: 'La cuenta está inactiva' });
    res.json({ token: firmar({ tipo: 'admin', id: u.id_usuario }), usuario: { nombre: u.nombre, correo: u.correo } });
  } catch (err) { next(err); }
});

const auth = requiere('admin');

// Pedidos para gestionar, con filtro opcional por estado
router.get('/admin/pedidos', auth, async (req, res, next) => {
  try {
    const params = [];
    let filtro = '';
    if (req.query.estado) { params.push(req.query.estado); filtro = 'WHERE p.estado = $1'; }
    const { rows } = await pool.query(
      `SELECT p.id_pedido AS id, p.fecha_pedido, p.estado, p.total::float8 AS total, p.medio_pago,
              p.numero_guia, c.nombre AS cliente, c.correo
         FROM pedido p JOIN cliente c ON c.id_cliente = p.id_cliente
         ${filtro} ORDER BY p.fecha_pedido DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Cambiar el estado del pedido siguiendo el recorrido permitido
router.patch('/admin/pedidos/:id/estado', auth, async (req, res, next) => {
  const db = await pool.connect();
  try {
    const id = Number.parseInt(req.params.id, 10);
    const nuevo = String(req.body.estado || '');
    await db.query('BEGIN');
    const actual = await db.query('SELECT estado FROM pedido WHERE id_pedido = $1 FOR UPDATE', [id]);
    if (!actual.rows.length) throw Object.assign(new Error(), { status: 404, mensaje: 'Pedido no encontrado' });
    const estadoActual = actual.rows[0].estado;
    if (!(TRANSICIONES[estadoActual] || []).includes(nuevo)) {
      throw Object.assign(new Error(), { status: 409, mensaje: `No se puede pasar de "${estadoActual}" a "${nuevo}"` });
    }

    if (nuevo === 'en_proceso') {
      const factura = emitirFacturaSiigo({ idPedido: id });
      await db.query(
        `INSERT INTO factura_siigo (id_pedido, numero_factura, estado_envio) VALUES ($1, $2, 'pendiente_envio')
         ON CONFLICT (id_pedido) DO NOTHING`,
        [id, factura.numeroFactura]
      );
    }
    if (nuevo === 'enviado') {
      await db.query("UPDATE pedido SET numero_guia = 'IR-' || LPAD($1::text, 8, '0') WHERE id_pedido = $1", [id]);
      await db.query("UPDATE factura_siigo SET estado_envio = 'enviada', fecha_envio = NOW() WHERE id_pedido = $1", [id]);
    }

    await db.query('UPDATE pedido SET estado = $2 WHERE id_pedido = $1', [id, nuevo]);
    await db.query('COMMIT');
    const { rows } = await pool.query('SELECT id_pedido AS id, estado, numero_guia FROM pedido WHERE id_pedido = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.mensaje });
    next(err);
  } finally {
    db.release();
  }
});

module.exports = router;
