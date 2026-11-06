const path = require('path');
const express = require('express');
const catalogo = require('./rutas/catalogo');
const cuenta = require('./rutas/cuenta');
const carrito = require('./rutas/carrito');
const pedidos = require('./rutas/pedidos');
const admin = require('./rutas/admin');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));
app.use('/api', catalogo);
app.use('/api', cuenta);
app.use('/api', carrito);
app.use('/api', pedidos);
app.use('/api', admin);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
