-- Migración para una base ya creada: agrega el precio anterior de los productos en oferta.
-- Ejecútalo una sola vez en la base cellmy (no borra datos).
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_anterior NUMERIC(12,2);

-- Precios anteriores de los productos en oferta (diseño de Figma)
UPDATE producto SET precio_anterior = 749900  WHERE referencia = 'SM-A155';
UPDATE producto SET precio_anterior = 519900  WHERE referencia = 'REDMI-12';
UPDATE producto SET precio_anterior = 1799900 WHERE referencia = 'TV-SMART-50';
UPDATE producto SET precio_anterior = 899900  WHERE referencia = 'TV-HD-32';
UPDATE producto SET precio_anterior = 2499900 WHERE referencia = 'TV-4K-55';
