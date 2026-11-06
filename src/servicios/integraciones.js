// Adaptadores de servicios externos.
// Hoy solo existe el modo simulado (PAGO_MODO=simulado). Cuando lleguen las
// credenciales de Wompi, Addi y Siigo se agrega la implementación real aquí,
// sin cambiar las rutas que usan estas funciones.

const modo = process.env.PAGO_MODO || 'simulado';

function crearTransaccionPago({ idPedido, monto }) {
  if (modo !== 'simulado') {
    throw new Error('Proveedor de pago no implementado: ' + modo);
  }
  return { referencia: `SIM-${idPedido}-${Date.now()}`, estado: 'pendiente', monto };
}

function solicitarFinanciacionAddi({ idPedido, monto }) {
  return { referencia: `ADDI-SIM-${idPedido}`, estado: 'pendiente', monto };
}

function emitirFacturaSiigo({ idPedido }) {
  return { numeroFactura: `SIM-FV-${idPedido}`, estado: 'pendiente_envio' };
}

module.exports = { crearTransaccionPago, solicitarFinanciacionAddi, emitirFacturaSiigo };
