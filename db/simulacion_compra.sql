-- SIMULACIÓN DE UNA COMPRA COMPLETA (solo para demostración).
-- Cliente ficticio: Carlos Ramírez, de Bogotá.
-- Recorrido: registro > dirección > carrito > checkout > pago aprobado > descuento de stock
--            > despacho por el administrador > seguimiento del pedido.
-- Ejecútalo UNA sola vez sobre la base recién cargada con schema.sql y seed.sql.

DO $$
DECLARE
  v_cliente   INT;
  v_direccion INT;
  v_pedido    INT;
  v_tv_id     INT;  v_tv_prod    INT;  v_tv_precio    NUMERIC;
  v_rd_id     INT;  v_rd_prod    INT;  v_rd_precio    NUMERIC;
  v_envio     NUMERIC := 18000;
  v_subtotal  NUMERIC;
  v_total     NUMERIC;
BEGIN
  -- 1. Registro del cliente
  INSERT INTO cliente (nombre, correo, password_hash, telefono)
  VALUES ('Carlos Ramírez', 'demo.carlos@correo.com', 'hash-simulado', '310 555 0198')
  RETURNING id_cliente INTO v_cliente;

  -- 2. Dirección de entrega
  INSERT INTO direccion_cliente (id_cliente, direccion, ciudad, departamento, telefono_contacto, predeterminada)
  VALUES (v_cliente, 'Carrera 15 # 93-40, apto 502', 'Bogotá', 'Bogotá D.C.', '310 555 0198', TRUE)
  RETURNING id_direccion INTO v_direccion;

  -- 3. Carrito: dos productos
  SELECT v.id_variante, v.id_producto, (p.precio_base + v.precio_adicional)
    INTO v_tv_id, v_tv_prod, v_tv_precio
    FROM variante_producto v JOIN producto p ON p.id_producto = v.id_producto
   WHERE v.sku = 'TV-SMART-50';

  SELECT v.id_variante, v.id_producto, (p.precio_base + v.precio_adicional)
    INTO v_rd_id, v_rd_prod, v_rd_precio
    FROM variante_producto v JOIN producto p ON p.id_producto = v.id_producto
   WHERE v.sku = 'CEL-RD12-128-AZ';

  INSERT INTO carrito (id_cliente) VALUES (v_cliente);
  INSERT INTO item_carrito (id_carrito, id_variante, cantidad)
  SELECT c.id_carrito, v_tv_id, 1 FROM carrito c WHERE c.id_cliente = v_cliente;
  INSERT INTO item_carrito (id_carrito, id_variante, cantidad)
  SELECT c.id_carrito, v_rd_id, 1 FROM carrito c WHERE c.id_cliente = v_cliente;

  -- 4. Checkout: se crea el pedido en estado pendiente
  v_subtotal := v_tv_precio + v_rd_precio;
  v_total    := v_subtotal + v_envio;

  INSERT INTO pedido (id_cliente, id_direccion, estado, subtotal, costo_envio, total,
                      medio_pago, tipo_documento_facturacion, numero_documento_facturacion)
  VALUES (v_cliente, v_direccion, 'pendiente', v_subtotal, v_envio, v_total,
          'wompi', 'Cédula de ciudadanía', '1023456789')
  RETURNING id_pedido INTO v_pedido;

  INSERT INTO detalle_pedido (id_pedido, id_variante, cantidad, precio_unitario, subtotal)
  VALUES (v_pedido, v_tv_id, 1, v_tv_precio, v_tv_precio),
         (v_pedido, v_rd_id, 1, v_rd_precio, v_rd_precio);

  -- 5. Pago aprobado por Wompi (simulado)
  INSERT INTO pago (id_pedido, monto, estado, referencia_pasarela, fecha_pago)
  VALUES (v_pedido, v_total, 'aprobado', 'SIM-WMP-' || v_pedido, NOW());

  UPDATE pedido SET estado = 'pagado' WHERE id_pedido = v_pedido;

  -- 6. Descuento de stock y vaciado del carrito
  UPDATE variante_producto SET stock = stock - 1 WHERE id_variante IN (v_tv_id, v_rd_id);
  DELETE FROM item_carrito WHERE id_carrito IN (SELECT id_carrito FROM carrito WHERE id_cliente = v_cliente);

  -- 7. Registro de la compra en las interacciones (RF-29)
  INSERT INTO interaccion_producto (id_producto, id_cliente, tipo)
  VALUES (v_tv_prod, v_cliente, 'compra'), (v_rd_prod, v_cliente, 'compra');

  -- 8. El administrador prepara y despacha el pedido
  UPDATE pedido SET estado = 'en_proceso' WHERE id_pedido = v_pedido;
  INSERT INTO factura_siigo (id_pedido, numero_factura, estado_envio)
  VALUES (v_pedido, 'SIM-FV-' || v_pedido, 'enviada');
  UPDATE pedido SET estado = 'enviado', numero_guia = 'IR-' || LPAD(v_pedido::text, 8, '0')
   WHERE id_pedido = v_pedido;

  -- 9. Entrega confirmada
  UPDATE pedido SET estado = 'entregado' WHERE id_pedido = v_pedido;

  RAISE NOTICE 'Simulación completa. Pedido # % por $ % para el cliente %.', v_pedido, v_total, v_cliente;
END $$;

-- Resultado: estado final del pedido
SELECT p.id_pedido AS pedido,
       c.nombre AS cliente,
       p.estado,
       p.total,
       pg.estado AS pago,
       p.numero_guia AS guia,
       f.numero_factura AS factura,
       f.estado_envio AS envio_factura
  FROM pedido p
  JOIN cliente c ON c.id_cliente = p.id_cliente
  LEFT JOIN pago pg ON pg.id_pedido = p.id_pedido
  LEFT JOIN factura_siigo f ON f.id_pedido = p.id_pedido
 WHERE c.correo = 'demo.carlos@correo.com';

-- Resultado: stock después de la compra
SELECT sku, stock FROM variante_producto
 WHERE sku IN ('TV-SMART-50', 'CEL-RD12-128-AZ') ORDER BY sku;
