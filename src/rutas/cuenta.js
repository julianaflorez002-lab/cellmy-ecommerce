const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { firmar, requiere } = require('../servicios/sesion');

const router = express.Router();
const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);

// Registro de cliente
router.post('/auth/registro', async (req, res, next) => {
  try {
    const { nombre, correo, password, telefono } = req.body || {};
    if (!nombre || !correo || !password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    if (!correoValido(correo)) return res.status(400).json({ error: 'El correo no es válido' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const existe = await pool.query('SELECT 1 FROM cliente WHERE correo = $1', [correo.toLowerCase()]);
    if (existe.rows.length) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO cliente (nombre, correo, password_hash, telefono) VALUES ($1, $2, $3, $4) RETURNING id_cliente, nombre, correo',
      [nombre.trim(), correo.toLowerCase(), hash, telefono || null]
    );
    const cliente = rows[0];
    res.status(201).json({
      token: firmar({ tipo: 'cliente', id: cliente.id_cliente }),
      cliente: { id: cliente.id_cliente, nombre: cliente.nombre, correo: cliente.correo },
    });
  } catch (err) { next(err); }
});

// Inicio de sesión de cliente
router.post('/auth/login', async (req, res, next) => {
  try {
    const { correo, password } = req.body || {};
    const { rows } = await pool.query(
      "SELECT id_cliente, nombre, correo, password_hash, estado FROM cliente WHERE correo = $1",
      [String(correo || '').toLowerCase()]
    );
    const cliente = rows[0];
    if (!cliente || !(await bcrypt.compare(String(password || ''), cliente.password_hash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    if (cliente.estado !== 'activo') return res.status(403).json({ error: 'La cuenta está inactiva' });
    res.json({
      token: firmar({ tipo: 'cliente', id: cliente.id_cliente }),
      cliente: { id: cliente.id_cliente, nombre: cliente.nombre, correo: cliente.correo },
    });
  } catch (err) { next(err); }
});

// Datos del cliente en sesión
router.get('/cuenta', requiere('cliente'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id_cliente AS id, nombre, correo FROM cliente WHERE id_cliente = $1', [req.usuario.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Direcciones del cliente
router.get('/cuenta/direcciones', requiere('cliente'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_direccion AS id, direccion, ciudad, departamento, telefono_contacto, predeterminada
         FROM direccion_cliente WHERE id_cliente = $1 ORDER BY predeterminada DESC, id_direccion`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/cuenta/direcciones', requiere('cliente'), async (req, res, next) => {
  try {
    const { direccion, ciudad, departamento, telefono_contacto } = req.body || {};
    if (!direccion || !ciudad || !departamento || !telefono_contacto) {
      return res.status(400).json({ error: 'Dirección, ciudad, departamento y teléfono son obligatorios' });
    }
    const previas = await pool.query('SELECT 1 FROM direccion_cliente WHERE id_cliente = $1', [req.usuario.id]);
    const { rows } = await pool.query(
      `INSERT INTO direccion_cliente (id_cliente, direccion, ciudad, departamento, telefono_contacto, predeterminada)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_direccion AS id, direccion, ciudad, departamento, telefono_contacto, predeterminada`,
      [req.usuario.id, direccion.trim(), ciudad.trim(), departamento.trim(), telefono_contacto.trim(), previas.rows.length === 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
