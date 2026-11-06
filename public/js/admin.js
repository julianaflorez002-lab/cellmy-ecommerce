const contenido = document.getElementById('contenido');
const SIGUIENTE = { pagado: ['en_proceso'], en_proceso: ['enviado'], enviado: ['entregado'] };
const ETIQUETA = { pendiente: 'Pendiente', pagado: 'Pagado', en_proceso: 'En proceso', enviado: 'Enviado', entregado: 'Entregado', rechazado: 'Rechazado' };

document.getElementById('salir').addEventListener('click', () => cerrarSesion(TOKEN_ADMIN));

function pantallaLogin() {
  document.getElementById('salir').classList.add('oculto');
  const form = crear('form', 'auth-card formulario');
  form.append(crear('h2', '', 'Acceso del personal'));
  const correo = crear('input'); correo.type = 'email'; correo.required = true;
  const clave = crear('input'); clave.type = 'password'; clave.required = true;
  form.append(crear('label', '', 'Correo '), correo, crear('label', '', 'Contraseña '), clave);
  const boton = crear('button', 'boton-principal', 'Entrar'); boton.type = 'submit';
  form.append(boton);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await api('/admin/login', { metodo: 'POST', cuerpo: { correo: correo.value, password: clave.value }, clave: TOKEN_ADMIN });
      localStorage.setItem(TOKEN_ADMIN, r.token);
      iniciar();
    } catch (err) { mensaje(contenido, err.message); }
  });
  contenido.replaceChildren(form);
}

async function cambiarEstado(id, estado) {
  try {
    await api(`/admin/pedidos/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado }, clave: TOKEN_ADMIN });
    listar();
  } catch (err) {
    if (err.status === 401 || err.status === 403) return pantallaLogin();
    mensaje(contenido, err.message);
  }
}

async function listar() {
  try {
    const pedidos = await api('/admin/pedidos', { clave: TOKEN_ADMIN });
    const tabla = crear('table', 'tabla');
    const cab = crear('tr');
    ['Pedido', 'Fecha', 'Cliente', 'Total', 'Pago', 'Estado', 'Guía', 'Acción'].forEach((t) => cab.append(crear('th', '', t)));
    tabla.append(cab);
    pedidos.forEach((p) => {
      const tr = crear('tr');
      tr.append(crear('td', '', '#' + p.id));
      tr.append(crear('td', '', new Date(p.fecha_pedido).toLocaleDateString('es-CO')));
      tr.append(crear('td', '', p.cliente));
      tr.append(crear('td', '', formatoCop.format(p.total)));
      tr.append(crear('td', '', p.medio_pago));
      tr.append(crear('td', '', ETIQUETA[p.estado] || p.estado));
      tr.append(crear('td', '', p.numero_guia || '—'));
      const celda = crear('td');
      const siguientes = SIGUIENTE[p.estado] || [];
      if (siguientes.length) {
        const boton = crear('button', 'boton-principal', 'Marcar como ' + ETIQUETA[siguientes[0]].toLowerCase());
        boton.addEventListener('click', () => cambiarEstado(p.id, siguientes[0]));
        celda.append(boton);
      } else {
        celda.append(crear('span', 'sku', 'Sin acciones'));
      }
      tr.append(celda);
      tabla.append(tr);
    });
    contenido.replaceChildren(crear('h1', '', 'Pedidos'), tabla);
    document.getElementById('salir').classList.remove('oculto');
  } catch (err) {
    if (err.status === 401 || err.status === 403) return pantallaLogin();
    mensaje(contenido, err.message);
  }
}

function iniciar() {
  if (!tokenDe(TOKEN_ADMIN)) return pantallaLogin();
  listar();
}
iniciar();
