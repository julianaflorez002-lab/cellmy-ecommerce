const contenido = document.getElementById('contenido');
const ETAPAS = [['pagado', 'Pagado'], ['en_proceso', 'En proceso'], ['enviado', 'Enviado'], ['entregado', 'Entregado']];
const ORDEN = ['pendiente', 'pagado', 'en_proceso', 'enviado', 'entregado'];

document.getElementById('salir').addEventListener('click', () => cerrarSesion());

function lineaDeTiempo(estado) {
  const posicion = ORDEN.indexOf(estado);
  const lista = crear('ol', 'linea-tiempo');
  ETAPAS.forEach(([clave, texto], i) => {
    const hecho = posicion >= ORDEN.indexOf(clave);
    const paso = crear('li', hecho ? 'etapa hecha' : 'etapa', texto);
    lista.append(paso);
  });
  return lista;
}

async function mostrarLista() {
  const pedidos = await api('/pedidos');
  if (!pedidos.length) {
    contenido.replaceChildren(crear('p', 'mensaje', 'Todavía no tienes pedidos.'), enlaceCatalogo());
    return;
  }
  const tabla = crear('table', 'tabla');
  tabla.append(crear('thead'));
  tabla.querySelector('thead').append(fila(['Pedido', 'Fecha', 'Estado', 'Total', ''], true));
  const cuerpo = crear('tbody');
  pedidos.forEach((p) => {
    const ver = crear('button', '', 'Ver');
    ver.addEventListener('click', () => location.search = '?id=' + p.id);
    const r = fila([`#${p.id}`, new Date(p.fecha_pedido).toLocaleDateString('es-CO'), p.estado, formatoCop.format(p.total), '']);
    r.lastChild.append(ver);
    cuerpo.append(r);
  });
  tabla.append(cuerpo);
  contenido.replaceChildren(tabla);
}

function fila(celdas, cabecera = false) {
  const tr = crear('tr');
  celdas.forEach((c) => tr.append(crear(cabecera ? 'th' : 'td', '', c)));
  return tr;
}

function enlaceCatalogo() {
  const a = crear('a', 'boton-secundario', 'Ver catálogo');
  a.href = '/';
  return a;
}

async function mostrarDetalle(id) {
  const p = await api('/pedidos/' + id);
  const bloque = crear('div', 'detalle-pedido');
  bloque.append(crear('h2', '', `Pedido #${p.id}`), lineaDeTiempo(p.estado));
  bloque.append(crear('p', '', 'Estado: ' + p.estado.replace('_', ' ')));
  if (p.numero_guia) bloque.append(crear('p', '', `Guía de Inter Rapidísimo: ${p.numero_guia}`));
  bloque.append(crear('p', 'sku', `Entrega en ${p.direccion}, ${p.ciudad}, ${p.departamento}`));

  const lista = crear('ul', 'productos');
  p.items.forEach((i) => {
    const nombre = [i.nombre, i.color, i.almacenamiento, i.pulgadas].filter(Boolean).join(' · ');
    lista.append(crear('li', '', `${i.cantidad} × ${nombre} · ${formatoCop.format(i.subtotal)}`));
  });
  bloque.append(lista);
  bloque.append(crear('p', '', `Envío: ${formatoCop.format(p.envio)} · Total: ${formatoCop.format(p.total)}`));

  const volver = crear('a', 'boton-secundario', 'Volver a mis pedidos');
  volver.href = '/pedidos.html';
  contenido.replaceChildren(bloque, volver);
}

async function iniciar() {
  if (!tokenDe()) return location.href = '/login.html?volver=pedidos.html';
  try {
    actualizarCabecera();
    const id = new URLSearchParams(location.search).get('id');
    if (id) await mostrarDetalle(id); else await mostrarLista();
  } catch (err) {
    if (err.status === 401) return cerrarSesion();
    mensaje(contenido, err.message);
  }
}
iniciar();
