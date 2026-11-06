const formato = formatoCop;
let varianteElegida = null;

function etiquetaVariante(v) {
  return [v.color, v.almacenamiento, v.pulgadas].filter(Boolean).join(' · ') || v.sku;
}

function mostrarError(mensaje_) {
  document.getElementById('detalle').replaceChildren(crear('p', 'error', mensaje_));
}

function render(p) {
  const detalle = document.getElementById('detalle');
  document.title = `Cellmy · ${p.nombre}`;

  const columnaFoto = crear('div', 'foto', 'Foto principal');
  const info = crear('div', '');
  const precio = crear('p', 'precio-grande', '');
  const anterior = crear('p', 'precio-anterior-bloque', '');
  const sku = crear('p', 'sku', '');
  const stock = crear('p', 'mensaje', '');
  const opciones = crear('div', 'opciones');
  const boton = crear('button', 'boton-principal', 'Agregar al carrito');
  const estadoCompra = crear('p', 'mensaje', '');

  info.append(
    crear('p', 'sku', p.categoria),
    crear('h1', '', p.nombre),
    crear('p', 'sku', [p.marca, p.referencia].filter(Boolean).join(' · ')),
    precio, anterior, sku,
    crear('p', 'sku', 'Variantes'),
    opciones, stock, boton, estadoCompra
  );
  if (p.descripcion) info.append(crear('p', 'mensaje', p.descripcion));

  if (p.precio_anterior && p.precio_anterior > p.precio_base) {
    const descuento = Math.floor((1 - p.precio_base / p.precio_anterior) * 100);
    anterior.textContent = `Antes ${formato.format(p.precio_anterior)} · -${descuento}%`;
  }

  const variantes = p.variantes;
  const botones = variantes.map((v) => {
    const b = crear('button', '', etiquetaVariante(v));
    b.disabled = v.stock === 0;
    b.addEventListener('click', () => seleccionar(v));
    opciones.append(b);
    return b;
  });

  function seleccionar(v) {
    varianteElegida = v;
    botones.forEach((b) => b.classList.remove('seleccionada'));
    botones[variantes.indexOf(v)].classList.add('seleccionada');
    precio.textContent = formato.format(v.precio);
    sku.textContent = `SKU: ${v.sku}`;
    stock.textContent = v.stock > 0 ? `Disponibles: ${v.stock}` : 'Sin stock';
    boton.disabled = v.stock === 0;
    estadoCompra.textContent = '';
  }

  boton.addEventListener('click', async () => {
    if (!tokenDe()) return location.href = `/login.html?volver=${encodeURIComponent('producto.html?id=' + p.id)}`;
    boton.disabled = true;
    try {
      await api('/carrito/items', { metodo: 'POST', cuerpo: { id_variante: varianteElegida.id, cantidad: 1 } });
      estadoCompra.textContent = 'Producto agregado al carrito.';
      actualizarCabecera();
    } catch (err) {
      if (err.status === 401) return location.href = `/login.html?volver=${encodeURIComponent('producto.html?id=' + p.id)}`;
      estadoCompra.textContent = err.message;
    } finally {
      boton.disabled = false;
    }
  });

  const inicial = variantes.find((v) => v.stock > 0);
  if (inicial) seleccionar(inicial);
  else {
    precio.textContent = formato.format(p.precio_base);
    stock.textContent = 'Sin stock';
    boton.disabled = true;
  }

  detalle.replaceChildren(columnaFoto, info);
}

async function iniciar() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return mostrarError('Producto no indicado.');
  actualizarCabecera();
  const res = await fetch(`/api/productos/${encodeURIComponent(id)}`);
  if (!res.ok) {
    return mostrarError(res.status === 404 ? 'Producto no encontrado.' : 'No fue posible cargar el producto.');
  }
  render(await res.json());
}

iniciar();
