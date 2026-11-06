// Crea un usuario administrador.  Uso: node scripts/crear-admin.js correo contraseña "Nombre"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

(async () => {
  const [correo, password, nombre] = process.argv.slice(2);
  if (!correo || !password || !nombre) {
    console.log('Uso: node scripts/crear-admin.js correo contraseña "Nombre"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.log('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO usuario_administrativo (id_rol, nombre, correo, password_hash)
     VALUES ((SELECT id_rol FROM rol WHERE nombre = 'Administrador'), $1, $2, $3)
     ON CONFLICT (correo) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [nombre, correo.toLowerCase(), hash]
  );
  console.log(`Administrador listo: ${correo}`);
  await pool.end();
})().catch((err) => { console.error(err.message); process.exit(1); });
