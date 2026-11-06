const contenido = document.getElementById('contenido');

function nombreVariante(i) {
  return [i.nombre, i.color, i.almacenamiento, i.pulgadas].filter(Boolean).join(' · ');
}

function renderItems(carrito) {
  if (!carrito.items.length) {
    contenido.replaceChildren(crear('p', 'mensaje', 'Tu carrito está vacío.'), crear('a', 'boton-secundario', 'Ver catálogo'));
    contenido.lastChild.href = '/';
    return;
  }

  const lista = crear('div', 'lista-carrito');
  carrito.items.forEach((i) => {
    const fila = crear('div', 'fila-carrito');
    const info = crear('div', 'info');
    info.append(crear('h3', '', nombreVariante(i)), crear('p', 'sku', 'SKU ' + i.sku));
    const controles = crear('div', 'controles');
    const menos = crear('button', '', '−');
    const cantidad = crear('span', 'cantidad', String(i.cantidad));
    const mas = crear('button', '', '+');
    const quitar = crear('button', 'quitar', 'Quitar');
    menos.addEventListener('click', () => cambiar(i.id, i.cantidad - 1));
    mas.addEventListener('click', () => cambiar(i.id, i.cantidad + 1));
    quitar.addEventListener('click', () => cambiar(i.id, 0));
    mas.disabled = i.cantidad >= i.stock;
    controles.append(menos, cantidad, mas, quitar);
    fila.append(info, controles, crear('p', 'subtotal', formatoCop.format(i.subtotal)));
    lista.append(fila);
  });

  const resumen = crear('aside', 'resumen-box');
  resumen.append(
    crear('h2', '', 'Resumen'),
    crear('p', '', 'Subtotal: ' + formatoCop.format(carrito.total)),
    crear('p', 'sku', 'El envío y el total se calculan al confirmar la compra.')
  );
  const continuar = crear('a', 'boton-principal', 'Continuar con la compra');
  continuar.href = '/checkout.html';
  resumen.append(continuar);

  const grid = crear('div', 'carrito-grid');
  grid.append(lista, resumen);
  contenido.replaceChildren(grid);
}

async function cambiar(idVariante, cantidad) {
  try {
    renderItems(await api('/carrito/items/' + idVariante, { metodo: 'PUT', cuerpo: { cantidad } }));
    actualizarCabecera();
  } catch (err) {
    if (err.status === 401) return location.href = '/login.html?volver=carrito.html';
    mensaje(contenido, err.message);
  }
}

async function iniciar() {
  if (!tokenDe()) return location.href = '/login.html?volver=carrito.html';
  try {
    renderItems(await api('/carrito'));
    actualizarCabecera();
  } catch (err) {
    if (err.status === 401) return location.href = '/login.html?volver=carrito.html';
    mensaje(contenido, 'No fue posible cargar el carrito.');
  }
}
iniciar();
