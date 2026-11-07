// Panel administrativo: menú lateral y secciones según el prototipo de Figma.
const SECCIONES = [
  ['dashboard', 'Dashboard'], ['productos', 'Productos'], ['categorias', 'Categorías'],
  ['proveedores', 'Proveedores'], ['pedidos', 'Pedidos'], ['clientes', 'Clientes'],
  ['reportes', 'Reportes'], ['usuarios', 'Usuarios y roles'],
];
const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente', pagado: 'Pagado', en_proceso: 'En proceso', enviado: 'Enviado',
  entregado: 'Entregado', rechazado: 'Rechazado', activo: 'Activo', inactivo: 'Inactivo',
};
const SIGUIENTE = { pagado: 'en_proceso', en_proceso: 'enviado', enviado: 'entregado' };
const TIPO_ESTADO = {
  pagado: 'ok', entregado: 'ok', activo: 'ok', en_proceso: 'aviso', pendiente: 'aviso',
  enviado: 'envio', inactivo: 'neutro', rechazado: 'error',
};

const app = document.getElementById('app');
const menu = document.getElementById('menu');
const titulo = document.getElementById('titulo');
const salirBtn = document.getElementById('salir');

const admin = (ruta, opciones = {}) => api(ruta, { clave: TOKEN_ADMIN, ...opciones });
const esAcceso = (err) => err.status === 401 || err.status === 403;

function badge(estado) {
  const span = crear('span', 'adm-badge ' + (TIPO_ESTADO[estado] || 'neutro'), ETIQUETA_ESTADO[estado] || estado);
  return span;
}
function celdaHtml(texto) { return crear('span', '', texto ?? '—'); }

function tabla(cabeceras, filas) {
  const t = crear('table', 'tabla');
  const tr = crear('tr');
  cabeceras.forEach((c) => tr.append(crear('th', '', c)));
  t.append(crear('thead'));
  t.querySelector('thead').append(tr);
  const cuerpo = crear('tbody');
  filas.forEach((fila) => {
    const r = crear('tr');
    fila.forEach((celda) => {
      const td = crear('td');
      if (celda instanceof Node) td.append(celda); else td.append(celdaHtml(celda));
      r.append(td);
    });
    cuerpo.append(r);
  });
  t.append(cuerpo);
  return t;
}

function panel(titulo_, ...hijos) {
  const p = crear('section', 'adm-panel');
  p.append(crear('h2', '', titulo_), ...hijos);
  return p;
}

function kpi(etiqueta, valor, nota) {
  const k = crear('div', 'adm-kpi');
  k.append(crear('span', 'adm-kpi-etiqueta', etiqueta), crear('strong', 'adm-kpi-valor', valor), crear('span', 'adm-kpi-nota', nota));
  return k;
}

// Columnas verticales (ventas por semana o por día)
function columnas(items, etiqueta, valor) {
  const max = Math.max(...items.map((i) => i[valor]), 1);
  const cont = crear('div', 'adm-barras');
  items.forEach((i) => {
    const col = crear('div', 'adm-col');
    const barra = crear('div', 'adm-col-barra');
    barra.style.height = Math.max((i[valor] / max) * 100, 2) + '%';
    barra.title = formatoCop.format(i[valor]);
    col.append(barra, crear('span', 'adm-col-etiqueta', i[etiqueta]));
    cont.append(col);
  });
  return cont;
}

// Barras horizontales (productos más vistos)
function filasBarra(items, etiqueta, valor, unidad) {
  const max = Math.max(...items.map((i) => i[valor]), 1);
  const cont = crear('div', 'adm-filas');
  items.forEach((i) => {
    const fila = crear('div', 'adm-fila');
    const pista = crear('div', 'adm-fila-pista');
    const barra = crear('div', 'adm-fila-barra');
    barra.style.width = (i[valor] / max) * 100 + '%';
    pista.append(barra);
    fila.append(crear('span', 'adm-fila-nombre', i[etiqueta]), pista, crear('span', 'adm-fila-valor', i[valor] + ' ' + unidad));
    cont.append(fila);
  });
  return cont;
}

function enmascarar(correo) {
  const [usuario, dominio] = String(correo).split('@');
  return usuario.slice(0, 1) + '***@' + dominio;
}

function pintarEn(contenedor, nodos) { contenedor.replaceChildren(...nodos); }

// ---------- Secciones ----------
async function vistaDashboard() {
  const d = await admin('/admin/resumen');
  const grid = crear('div', 'adm-kpis');
  grid.append(
    kpi('Pedidos del mes', String(d.kpi.pedidos_mes), 'Pedidos registrados este mes'),
    kpi('Ventas del mes', formatoCop.format(d.kpi.ventas_mes), 'Pedidos pagados o en curso'),
    kpi('Productos activos', String(d.kpi.productos_activos), 'Productos visibles en la tienda'),
    kpi('Stock bajo', String(d.kpi.stock_bajo), 'Variantes con 3 unidades o menos'),
  );
  const ventas = panel('Ventas por semana',
    d.ventas_semana.length ? columnas(d.ventas_semana, 'semana', 'valor') : crear('p', 'adm-vacio', 'Aún no hay ventas en las últimas semanas.'));
  const vistos = panel('Productos con más interacción',
    d.mas_vistos.length ? filasBarra(d.mas_vistos, 'nombre', 'vistas', 'vistas') : crear('p', 'adm-vacio', 'Aún no hay visitas registradas.'));
  const grid2 = crear('div', 'adm-grid2');
  grid2.append(ventas, vistos);
  const recientes = panel('Pedidos recientes', d.pedidos_recientes.length
    ? tabla(['Pedido', 'Fecha', 'Cliente', 'Total', 'Pago', 'Estado'],
        d.pedidos_recientes.map((p) => ['#' + p.id, p.fecha, p.cliente, formatoCop.format(p.total), p.medio_pago || '—', badge(p.estado)]))
    : crear('p', 'adm-vacio', 'Todavía no hay pedidos.'));
  return [grid, grid2, recientes];
}

async function vistaProductos() {
  const barra = crear('div', 'adm-barra');
  const buscar = crear('input'); buscar.type = 'search'; buscar.placeholder = 'Buscar por nombre o referencia';
  const boton = crear('button', 'boton-secundario', 'Buscar');
  boton.type = 'button';
  const nuevo = crear('button', 'boton-principal', '+ Nuevo producto');
  nuevo.disabled = true; nuevo.title = 'Próximamente';
  barra.append(buscar, boton, nuevo);
  const contenedor = crear('div');

  async function cargar(q) {
    const datos = await admin('/admin/productos' + (q ? '?q=' + encodeURIComponent(q) : ''));
    const filas = datos.map((p) => {
      const accion = crear('button', 'adm-accion', p.estado === 'activo' ? 'Desactivar' : 'Activar');
      accion.addEventListener('click', async () => {
        try {
          await admin(`/admin/productos/${p.id}/estado`, { metodo: 'PATCH', cuerpo: { estado: p.estado === 'activo' ? 'inactivo' : 'activo' } });
          cargar(buscar.value.trim());
        } catch (err) { alert(err.message); }
      });
      const stock = p.stock === 0 ? 'Sin stock' : String(p.stock);
      return [p.nombre, p.categoria, String(p.variantes), stock, p.proveedores || '—', formatoCop.format(p.precio), badge(p.estado), accion];
    });
    pintarEn(contenedor, [datos.length
      ? tabla(['Producto', 'Categoría', 'Variantes', 'Stock', 'Proveedor', 'Precio', 'Estado', 'Acción'], filas)
      : crear('p', 'adm-vacio', 'No hay productos que coincidan con la búsqueda.')]);
  }
  boton.addEventListener('click', () => cargar(buscar.value.trim()));
  buscar.addEventListener('keydown', (e) => { if (e.key === 'Enter') cargar(buscar.value.trim()); });
  await cargar('');
  return [barra, contenedor];
}

async function vistaCategorias() {
  const datos = await admin('/admin/categorias');
  const nuevo = crear('button', 'boton-principal', '+ Nueva categoría');
  nuevo.disabled = true; nuevo.title = 'Próximamente';
  return [crear('div', 'adm-barra adm-barra-derecha', ''), nuevo,
    tabla(['Nombre', 'Descripción', 'Productos', 'Estado'],
      datos.map((c) => [c.nombre, c.descripcion || '—', String(c.productos), badge('activo')]))];
}

async function vistaProveedores() {
  const datos = await admin('/admin/proveedores');
  const nuevo = crear('button', 'boton-principal', '+ Nuevo proveedor');
  nuevo.disabled = true; nuevo.title = 'Próximamente';
  return [nuevo,
    tabla(['Nombre', 'Contacto', 'Teléfono', 'Correo', 'Productos', 'Estado'],
      datos.map((p) => [p.nombre, p.contacto || '—', p.telefono || '—', p.correo || '—', String(p.productos), badge(p.estado)]))];
}

async function vistaPedidos() {
  const barra = crear('div', 'adm-barra');
  const filtro = crear('select');
  [['', 'Todos los estados'], ['pagado', 'Pagado'], ['en_proceso', 'En proceso'], ['enviado', 'Enviado'], ['entregado', 'Entregado']]
    .forEach(([v, t]) => { const o = crear('option', '', t); o.value = v; filtro.append(o); });
  barra.append(filtro);
  const contenedor = crear('div');

  async function cargar() {
    const datos = await admin('/admin/pedidos' + (filtro.value ? '?estado=' + filtro.value : ''));
    const filas = datos.map((p) => {
      const celda = crear('div');
      const siguiente = SIGUIENTE[p.estado];
      if (siguiente) {
        const accion = crear('button', 'adm-accion', 'Marcar como ' + ETIQUETA_ESTADO[siguiente].toLowerCase());
        accion.addEventListener('click', async () => {
          try {
            await admin(`/admin/pedidos/${p.id}/estado`, { metodo: 'PATCH', cuerpo: { estado: siguiente } });
            cargar();
          } catch (err) { alert(err.message); }
        });
        celda.append(accion);
      } else {
        celda.append(crear('span', 'adm-vacio', 'Sin acciones'));
      }
      return ['#' + p.id, new Date(p.fecha_pedido).toLocaleDateString('es-CO'), p.cliente, formatoCop.format(p.total),
        p.medio_pago || '—', badge(p.estado), p.numero_guia || '—', celda];
    });
    pintarEn(contenedor, [datos.length
      ? tabla(['Pedido', 'Fecha', 'Cliente', 'Total', 'Pago', 'Estado', 'Guía', 'Acción'], filas)
      : crear('p', 'adm-vacio', 'No hay pedidos con ese estado.')]);
  }
  filtro.addEventListener('change', cargar);
  await cargar();
  return [barra, contenedor];
}

async function vistaClientes() {
  const datos = await admin('/admin/clientes');
  return [tabla(['Cliente', 'Correo', 'Teléfono', 'Pedidos', 'Total comprado', 'Registro', 'Estado'],
    datos.map((c) => [c.nombre, enmascarar(c.correo), c.telefono || '—', String(c.pedidos),
      formatoCop.format(c.total_comprado), new Date(c.fecha_registro).toLocaleDateString('es-CO'), badge(c.estado)]))];
}

async function vistaReportes() {
  const controles = crear('div', 'adm-barra');
  const dias = crear('select');
  [['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días']].forEach(([v, t]) => {
    const o = crear('option', '', t); o.value = v; dias.append(o);
  });
  dias.value = '30';
  controles.append(dias);
  const contenedor = crear('div');

  async function cargar() {
    const d = await admin('/admin/reportes?dias=' + dias.value);
    const kpis = crear('div', 'adm-kpis');
    kpis.append(kpi('Pedidos confirmados', String(d.totales.pedidos), 'Pagados o en curso'),
      kpi('Valor vendido', formatoCop.format(d.totales.valor), 'Total de pedidos confirmados'));
    const porDia = panel('Ventas por día', d.por_dia.length
      ? columnas(d.por_dia, 'dia', 'valor')
      : crear('p', 'adm-vacio', 'No hay ventas en este periodo.'));
    const porMedio = panel('Ventas por medio de pago', d.por_medio.length
      ? tabla(['Medio de pago', 'Pedidos', 'Valor'], d.por_medio.map((m) => [m.medio_pago, String(m.pedidos), formatoCop.format(m.valor)]))
      : crear('p', 'adm-vacio', 'Sin ventas registradas.'));
    pintarEn(contenedor, [kpis, porDia, porMedio]);
  }
  dias.addEventListener('change', cargar);
  await cargar();
  return [controles, contenedor];
}

async function vistaUsuarios() {
  const datos = await admin('/admin/usuarios');
  const nuevo = crear('button', 'boton-principal', '+ Nuevo usuario');
  nuevo.disabled = true; nuevo.title = 'Próximamente';
  return [nuevo, tabla(['Nombre', 'Correo', 'Rol', 'Estado', 'Creado'],
    datos.map((u) => [u.nombre, u.correo, u.rol, badge(u.estado), new Date(u.fecha_creacion).toLocaleDateString('es-CO')]))];
}

const VISTAS = {
  dashboard: vistaDashboard, productos: vistaProductos, categorias: vistaCategorias,
  proveedores: vistaProveedores, pedidos: vistaPedidos, clientes: vistaClientes,
  reportes: vistaReportes, usuarios: vistaUsuarios,
};

// ---------- Sesión y navegación ----------
function pantallaLogin() {
  document.body.classList.add('sin-sesion');
  salirBtn.classList.add('oculto');
  titulo.textContent = 'Acceso administrativo';
  menu.replaceChildren();
  const form = crear('form', 'adm-login');
  const logo = crear('img', 'adm-logo-img adm-logo-login'); logo.src = 'img/logo.png'; logo.alt = 'Cellmy';
  form.append(logo, crear('p', 'sku', 'Acceso restringido a personal autorizado.'));
  const correo = crear('input'); correo.type = 'email'; correo.required = true; correo.placeholder = 'correo@cellmy.com';
  const clave = crear('input'); clave.type = 'password'; clave.required = true;
  const etiquetaCorreo = crear('label', '', 'Correo electrónico'); etiquetaCorreo.append(correo);
  const etiquetaClave = crear('label', '', 'Contraseña'); etiquetaClave.append(clave);
  const boton = crear('button', 'boton-principal', 'Ingresar'); boton.type = 'submit';
  const aviso = crear('div');
  form.append(etiquetaCorreo, etiquetaClave, boton, aviso);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await api('/admin/login', { metodo: 'POST', cuerpo: { correo: correo.value, password: clave.value }, clave: TOKEN_ADMIN });
      localStorage.setItem(TOKEN_ADMIN, r.token);
      localStorage.setItem('cellmy_admin_nombre', r.usuario.nombre);
      location.hash = '#dashboard';
      render();
    } catch (err) { mensaje(aviso, err.message); }
  });
  app.replaceChildren(form);
}

async function render() {
  if (!tokenDe(TOKEN_ADMIN)) return pantallaLogin();
  document.body.classList.remove('sin-sesion');
  salirBtn.classList.remove('oculto');
  document.getElementById('nombre-usuario').textContent = localStorage.getItem('cellmy_admin_nombre') || 'Administrador';

  const clave = location.hash.slice(1) || 'dashboard';
  const seccion = SECCIONES.find(([c]) => c === clave) || SECCIONES[0];
  titulo.textContent = seccion[1];
  menu.replaceChildren(...SECCIONES.map(([c, t]) => {
    const a = crear('a', c === seccion[0] ? 'activo' : '', t);
    a.href = '#' + c;
    return a;
  }));

  app.replaceChildren(crear('p', 'mensaje', 'Cargando…'));
  try {
    const nodos = await VISTAS[seccion[0]]();
    app.replaceChildren(...nodos);
  } catch (err) {
    if (esAcceso(err)) return pantallaLogin();
    app.replaceChildren(crear('p', 'mensaje-error', err.message));
  }
}

salirBtn.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_ADMIN);
  pantallaLogin();
});
window.addEventListener('hashchange', render);
render();
