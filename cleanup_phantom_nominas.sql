-- SQL para eliminar nóminas consolidadas fantasma (sin servicios asociados)
-- Ejecutar en Supabase SQL Editor

-- 1. Primero, verificar qué nóminas consolidadas no tienen servicios asociados
SELECT 
    n.id,
    n.concept,
    n.net_amount,
    n.payment_type,
    n.status,
    n.payment_date,
    COUNT(ns.id) as servicios_count
FROM studio_nominas n
LEFT JOIN studio_nomina_servicios ns ON ns.payroll_id = n.id
WHERE n.payment_type = 'consolidado'
    AND n.status = 'pagado'
GROUP BY n.id, n.concept, n.net_amount, n.payment_type, n.status, n.payment_date
HAVING COUNT(ns.id) = 0;

-- 2. Si las nóminas encontradas son las correctas, ejecutar la eliminación:
-- NOTA: Reemplaza 'NOMINA_ID_AQUI' con el ID de la nómina fantasma que quieres eliminar
-- O elimina todas las que no tienen servicios (descomenta la siguiente línea):

-- Opción A: Eliminar una nómina específica (reemplaza el ID)
-- DELETE FROM studio_nominas WHERE id = 'NOMINA_ID_AQUI' AND payment_type = 'consolidado' AND status = 'pagado';

-- Opción B: Eliminar TODAS las nóminas consolidadas sin servicios asociados
DELETE FROM studio_nominas
WHERE id IN (
    SELECT n.id
    FROM studio_nominas n
    LEFT JOIN studio_nomina_servicios ns ON ns.payroll_id = n.id
    WHERE n.payment_type = 'consolidado'
        AND n.status = 'pagado'
    GROUP BY n.id
    HAVING COUNT(ns.id) = 0
);

-- 3. Verificar que se eliminaron correctamente
SELECT 
    n.id,
    n.concept,
    n.net_amount,
    n.payment_type,
    n.status,
    COUNT(ns.id) as servicios_count
FROM studio_nominas n
LEFT JOIN studio_nomina_servicios ns ON ns.payroll_id = n.id
WHERE n.payment_type = 'consolidado'
    AND n.status = 'pagado'
GROUP BY n.id, n.concept, n.net_amount, n.payment_type, n.status
HAVING COUNT(ns.id) = 0;
