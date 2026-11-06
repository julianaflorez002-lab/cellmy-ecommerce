const jwt = require('jsonwebtoken');

// Token válido 7 días. tipo: 'cliente' o 'admin'
function firmar(datos) {
  return jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Verifica el token del encabezado Authorization y que sea del tipo esperado
function requiere(tipo) {
  return (req, res, next) => {
    const encabezado = req.headers.authorization || '';
    const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar' });
    try {
      const datos = jwt.verify(token, process.env.JWT_SECRET);
      if (datos.tipo !== tipo) return res.status(403).json({ error: 'No tienes permiso para esta acción' });
      req.usuario = datos;
      next();
    } catch (err) {
      res.status(401).json({ error: 'La sesión no es válida o ya venció' });
    }
  };
}

module.exports = { firmar, requiere };
