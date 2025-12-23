-- Agregar canal de adquisición "Directo"
INSERT INTO platform_acquisition_channels (
    id,
    name,
    description,
    color,
    icon,
    "order",
    is_active,
    is_visible,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid()::text,
    'Directo',
    'Contacto directo con el cliente',
    '#6366F1',
    'phone',
    0,
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (name) DO UPDATE
SET
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    "order" = EXCLUDED."order",
    is_active = EXCLUDED.is_active,
    is_visible = EXCLUDED.is_visible,
    updated_at = NOW();

