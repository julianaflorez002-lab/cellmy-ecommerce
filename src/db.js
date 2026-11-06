const { Pool } = require('pg');

// La conexión se toma de DATABASE_URL en el archivo .env
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
