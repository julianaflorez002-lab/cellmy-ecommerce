// Utilidades compartidas por todas las páginas: formato, llamadas a la API y sesión.
const TOKEN_CLIENTE = 'cellmy_token';
const TOKEN_ADMIN = 'cellmy_admin_token';
const formatoCop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function crear(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function tokenDe(clave = TOKEN_CLIENTE) { return localStorage.getItem(clave); }

async function api(ruta, { metodo = 'GET', cuerpo, clave = TOKEN_CLIENTE } = {}) {
  const cabeceras = { 'Content-Type': 'application/json' };
  const t = tokenDe(clave);
  if (t) cabeceras.Authorization = 'Bearer ' + t;
  const res = await fetch('/api' + ruta, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(datos.error || 'No fue posible completar la acción');
    error.status = res.status;
    throw error;
  }
  return datos;
}

// Actualiza el enlace de cuenta y el contador del carrito en el encabezado
async function actualizarCabecera() {
  const enlace = document.getElementById('cuenta-link');
  const contador = document.getElementById('carrito-contador');
  if (!enlace) return;
  if (tokenDe()) {
    enlace.textContent = 'Mi cuenta';
    enlace.href = '/pedidos.html';
    try {
      const c = await api('/carrito');
      if (contador) contador.textContent = c.items.reduce((s, i) => s + i.cantidad, 0);
    } catch (e) { /* sesión vencida: se mostrará al entrar a cada página */ }
  } else {
    enlace.textContent = 'Iniciar sesión';
    enlace.href = '/login.html';
    if (contador) contador.textContent = '0';
  }
}

function mensaje(contenedor, texto, tipo = 'error') {
  contenedor.replaceChildren(crear('p', 'mensaje-' + tipo, texto));
}

function cerrarSesion(clave = TOKEN_CLIENTE) {
  localStorage.removeItem(clave);
  location.href = '/';
}
