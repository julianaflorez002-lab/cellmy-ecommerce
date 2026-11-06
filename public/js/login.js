const volver = new URLSearchParams(location.search).get('volver') || 'pedidos.html';
const aviso = document.getElementById('aviso');

function mostrarPestana(cual) {
  const login = cual === 'login';
  document.getElementById('form-login').classList.toggle('oculto', !login);
  document.getElementById('form-registro').classList.toggle('oculto', login);
  document.getElementById('pestana-login').classList.toggle('activa', login);
  document.getElementById('pestana-registro').classList.toggle('activa', !login);
  aviso.replaceChildren();
}
document.getElementById('pestana-login').addEventListener('click', () => mostrarPestana('login'));
document.getElementById('pestana-registro').addEventListener('click', () => mostrarPestana('registro'));

function entrar(respuesta) {
  localStorage.setItem('cellmy_token', respuesta.token);
  location.href = volver;
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    entrar(await api('/auth/login', {
      metodo: 'POST',
      cuerpo: { correo: document.getElementById('login-correo').value, password: document.getElementById('login-password').value },
    }));
  } catch (err) { mensaje(aviso, err.message); }
});

document.getElementById('form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    entrar(await api('/auth/registro', {
      metodo: 'POST',
      cuerpo: {
        nombre: document.getElementById('reg-nombre').value,
        correo: document.getElementById('reg-correo').value,
        telefono: document.getElementById('reg-telefono').value,
        password: document.getElementById('reg-password').value,
      },
    }));
  } catch (err) { mensaje(aviso, err.message); }
});
