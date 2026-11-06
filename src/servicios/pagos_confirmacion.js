// Confirmación de un pago aprobado. La usan el checkout simulado hoy y el webhook de Wompi después.
// Dentro de la misma transacción de la base de datos:
//   - marca el pago como aprobado y el pedido como pagado
//   - descuenta el stock de cada variante
//   - vacía el carrito del cliente
async function confirmarPago(db, idPedido) {
  const pedido = await db.query('SELECT id_cliente, total FROM pedido WHERE id_pedido = $1', [idPedido]);
  const idCliente = pedido.rows[0].id_cliente;

  await db.query(
    "UPDATE pago SET estado = 'aprobado', fecha_pago = NOW() WHERE id_pedido = $1 AND estado = 'pendiente'",
    [idPedido]
  );
  await db.query("UPDATE pedido SET estado = 'pagado' WHERE id_pedido = $1", [idPedido]);
  await db.query(
    `UPDATE variante_producto v SET stock = v.stock - d.cantidad
       FROM detalle_pedido d
      WHERE d.id_variante = v.id_variante AND d.id_pedido = $1`,
    [idPedido]
  );
  await db.query(
    `DELETE FROM item_carrito WHERE id_carrito IN
       (SELECT id_carrito FROM carrito WHERE id_cliente = $1)`,
    [idCliente]
  );
}

module.exports = { confirmarPago };
