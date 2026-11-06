const contenido = document.getElementById('contenido');
let direcciones = [];
let carrito = null;

function pintarResumen() {
  const resumen = crear('aside', 'resumen-box');
  resumen.append(crear('h2', '', 'Resumen del pedido'));
  carrito.items.forEach((i) => resumen.append(crear('p', '', `${i.cantidad} × ${[i.nombre, i.color, i.almacenamiento, i.pulgadas].filter(Boolean).join(' · ')}`)));
  resumen.append(crear('p', '', 'Subtotal: ' + formatoCop.format(carrito.total)));
  resumen.append(crear('p', 'sku', 'El envío (Inter Rapidísimo) se suma al total.'));
  return resumen;
}

function formularioDireccion() {
  const box = crear('div', 'formulario');
  const campos = [['Dirección', 'direccion'], ['Ciudad', 'ciudad'], ['Departamento', 'departamento'], ['Teléfono de contacto', 'telefono_contacto']];
  campos.forEach(([etiqueta, nombre]) => {
    const label = crear('label', '', etiqueta + ' ');
    const input = crear('input');
    input.name = nombre;
    label.append(input);
    box.append(label);
  });
  const boton = crear('button', 'boton-secundario', 'Guardar dirección');
  boton.type = 'button';
  boton.addEventListener('click', async () => {
    const datos = {};
    box.querySelectorAll('input[name]').forEach((i) => { datos[i.name] = i.value.trim(); });
    try {
      await api('/cuenta/direcciones', { metodo: 'POST', cuerpo: datos });
      cargar();
    } catch (err) { mensaje(contenido, err.message); }
  });
  box.append(boton);
  return box;
}

function pintarFormulario() {
  const form = crear('form', 'formulario');

  const bloqueDir = crear('fieldset');
  bloqueDir.append(crear('legend', '', 'Dirección de envío'));
  direcciones.forEach((d, i) => {
    const label = crear('label', 'opcion');
    const radio = crear('input');
    radio.type = 'radio'; radio.name = 'id_direccion'; radio.value = d.id; radio.required = true;
    radio.checked = i === 0;
    label.append(radio, crear('span', '', `${d.direccion}, ${d.ciudad}, ${d.departamento} · ${d.telefono_contacto}`));
    bloqueDir.append(label);
  });
  bloqueDir.append(crear('p', 'sku', 'Agregar otra dirección:'), formularioDireccion());

  const bloqueDoc = crear('fieldset');
  bloqueDoc.append(crear('legend', '', 'Datos de facturación'));
  const tipo = crear('select'); tipo.name = 'tipo_documento';
  ['Cédula de ciudadanía', 'Cédula de extranjería', 'NIT', 'Pasaporte'].forEach((t) => {
    const o = crear('option', '', t); o.value = t; tipo.append(o);
  });
  const numero = crear('input'); numero.name = 'numero_documento'; numero.required = true;
  numero.inputMode = 'numeric'; numero.placeholder = 'Solo números';
  bloqueDoc.append(crear('label', '', 'Tipo de documento '), tipo, crear('label', '', 'Número de documento '), numero);

  const bloquePago = crear('fieldset');
  bloquePago.append(crear('legend', '', 'Método de pago'));
  [['wompi', 'Wompi', 'Tarjeta, PSE o botón bancario. Serás redirigido al entorno seguro de Wompi.'],
   ['addi', 'Addi', 'Financia tu compra a cuotas.']].forEach(([valor, titulo, texto], i) => {
    const label = crear('label', 'opcion');
    const radio = crear('input'); radio.type = 'radio'; radio.name = 'medio_pago'; radio.value = valor; radio.required = true; radio.checked = i === 0;
    label.append(radio, crear('strong', '', titulo + ' · '), crear('span', '', texto));
    bloquePago.append(label);
  });

  const enviar = crear('button', 'boton-principal', 'Confirmar y pagar');
  enviar.type = 'submit';
  form.append(bloqueDir, bloqueDoc, bloquePago, enviar);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(form));
    enviar.disabled = true;
    try {
      const pedido = await api('/pedidos', { metodo: 'POST', cuerpo: datos });
      confirmacion(pedido);
    } catch (err) {
      enviar.disabled = false;
      if (err.status === 401) return location.href = '/login.html?volver=checkout.html';
      mensaje(contenido, err.message);
    }
  });

  const grid = crear('div', 'carrito-grid');
  grid.append(form, pintarResumen());
  contenido.replaceChildren(grid);
}

function confirmacion(pedido) {
  const texto = pedido.estado === 'pagado'
    ? `Tu pago fue aprobado. Pedido #${pedido.id_pedido} por ${formatoCop.format(pedido.total)}.`
    : `Tu pedido #${pedido.id_pedido} quedó pendiente de pago.`;
  const enlace = crear('a', 'boton-principal', 'Ver el seguimiento de mi pedido');
  enlace.href = '/pedidos.html?id=' + pedido.id_pedido;
  contenido.replaceChildren(crear('div', 'confirmacion', ''), enlace);
  contenido.firstChild.append(crear('h2', '', '¡Gracias por tu compra!'), crear('p', '', texto));
  actualizarCabecera();
}

async function cargar() {
  try {
    [direcciones, carrito] = await Promise.all([api('/cuenta/direcciones'), api('/carrito')]);
    if (!carrito.items.length) {
      contenido.replaceChildren(crear('p', 'mensaje', 'Tu carrito está vacío.'));
      return;
    }
    if (!direcciones.length) {
      const grid = crear('div', 'carrito-grid');
      const bloque = crear('div', 'formulario');
      bloque.append(crear('h2', '', 'Primero agrega una dirección de envío'), formularioDireccion());
      grid.append(bloque, pintarResumen());
      contenido.replaceChildren(grid);
      return;
    }
    pintarFormulario();
    actualizarCabecera();
  } catch (err) {
    if (err.status === 401) return location.href = '/login.html?volver=checkout.html';
    mensaje(contenido, 'No fue posible cargar la página de compra.');
  }
}

if (!tokenDe()) location.href = '/login.html?volver=checkout.html';
else cargar();
