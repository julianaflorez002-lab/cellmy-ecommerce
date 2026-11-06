const params = new URLSearchParams(location.search);
const estado = { pagina: 1, limite: 12, total: 0 };
const el = (id) => document.getElementById(id);

function tarjeta(p) {
  const a = crear('a', 'tarjeta');
  a.href = `/producto.html?id=${p.id}`;

  const foto = crear('div', 'foto');
  if (p.precio_anterior && p.precio_anterior > p.precio_desde) {
    const descuento = Math.floor((1 - p.precio_desde / p.precio_anterior) * 100);
    foto.append(crear('span', 'descuento', `-${descuento}%`));
  }
  foto.append(crear('span', 'foto-texto', 'Foto'));

  const precios = crear('div', 'precios');
  precios.append(crear('span', 'precio', formatoCop.format(p.precio_desde)));
  if (p.precio_anterior && p.precio_anterior > p.precio_desde) {
    precios.append(crear('span', 'precio-anterior', formatoCop.format(p.precio_anterior)));
  }

  a.append(foto, crear('p', 'categoria-txt', p.categoria.toUpperCase()), crear('h3', '', p.nombre), precios);
  const disponible = p.stock_total > 0;
  a.append(crear('p', disponible ? 'stock' : 'stock agotado', disponible ? 'Disponible' : 'Sin stock'));
  return a;
}

function pintar(contenedor, productos) {
  contenedor.replaceChildren(...productos.map(tarjeta));
}

async function cargarCategorias() {
  const categorias = await (await fetch('/api/categorias')).json();
  for (const c of categorias) {
    const opcion = crear('option', '', c.nombre);
    opcion.value = c.id;
    el('categoria').append(opcion);
  }
  const cat = params.get('cat');
  if (cat) {
    const opcion = [...el('categoria').options].find((o) => o.textContent.toLowerCase() === cat.toLowerCase());
    if (opcion) el('categoria').value = opcion.value;
  }
}

async function cargarDestacados() {
  const res = await fetch('/api/productos?limite=8');
  if (res.ok) pintar(el('destacados'), (await res.json()).productos);
}

async function buscar() {
  const q = el('q').value.trim();
  const query = new URLSearchParams({ pagina: estado.pagina, limite: estado.limite });
  if (el('categoria').value) query.set('categoria', el('categoria').value);
  if (q) query.set('q', q);
  if (el('min').value) query.set('min', el('min').value);
  if (el('max').value) query.set('max', el('max').value);

  const res = await fetch('/api/productos?' + query);
  if (!res.ok) {
    el('resumen').textContent = 'No fue posible cargar los productos.';
    return;
  }
  const datos = await res.json();
  estado.total = datos.total;
  pintar(el('grilla'), datos.productos);
  el('resumen').textContent = datos.total === 0
    ? 'No encontramos productos con esos criterios.'
    : `${datos.total} producto(s)`;

  const paginas = Math.max(Math.ceil(estado.total / estado.limite), 1);
  el('pagina').textContent = `Página ${estado.pagina} de ${paginas}`;
  el('anterior').disabled = estado.pagina <= 1;
  el('siguiente').disabled = estado.pagina >= paginas;
}

el('buscar').addEventListener('submit', (e) => {
  e.preventDefault();
  estado.pagina = 1;
  buscar();
  el('catalogo').scrollIntoView({ behavior: 'smooth' });
});
el('aplicar').addEventListener('click', () => { estado.pagina = 1; buscar(); });
el('anterior').addEventListener('click', () => { estado.pagina -= 1; buscar(); });
el('siguiente').addEventListener('click', () => { estado.pagina += 1; buscar(); });

el('q').value = params.get('q') || '';
cargarDestacados();
cargarCategorias().then(buscar);
if (params.get('q') || params.get('cat')) {
  el('catalogo').scrollIntoView();
}
