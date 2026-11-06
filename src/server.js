require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env. Revisa el README.');
  process.exit(1);
}

const app = require('./app');

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => {
  console.log(`Cellmy escuchando en http://localhost:${puerto}`);
});
