// prisma/seed-demo-users.ts
/**
 * SEED USUARIOS DEMO V1.0
 * 
 * Crea usuarios de prueba con contraseñas hardcodeadas para desarrollo:
 * - Super Admin
 * - Studio Owner
 * - Fotógrafo
 * 
 * Uso: npx tsx prisma/seed-demo-users.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// USUARIOS DEMO CON CONTRASEÑAS
// ============================================

const DEMO_USERS = [
    {
        email: 'admin@prosocial.mx',
        password: 'Admin123!',
        full_name: 'Super Administrador',
        phone: '+52 33 0000 0001',
        platform_role: 'SUPER_ADMIN' as const,
        studio_role: null,
    },
    {
        email: 'owner@demo-studio.com',
        password: 'Owner123!',
        full_name: 'Carlos Méndez',
        phone: '+52 33 1234 5678',
        platform_role: 'SUSCRIPTOR' as const,
        studio_role: 'OWNER' as const,
    },
    {
        email: 'fotografo@demo-studio.com',
        password: 'Foto123!',
        full_name: 'Juan Pérez',
        phone: '+52 33 8765 4321',
        platform_role: 'SUSCRIPTOR' as const,
        studio_role: 'PHOTOGRAPHER' as const,
    },
];

const DEMO_STUDIO_ID = 'demo-studio-id';
const DEMO_STUDIO_SLUG = 'demo-studio';

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
    console.log('🌱 Iniciando SEED USUARIOS DEMO...\n');

    try {
        // 1. Crear usuarios en Supabase Auth
        await createSupabaseUsers();

        // 2. Crear registros en base de datos
        await createDatabaseUsers();

        console.log('\n✅ SEED USUARIOS DEMO COMPLETADO\n');
        console.log('🔐 Credenciales de acceso:');
        console.log('  Super Admin: admin@prosocial.mx / Admin123!');
        console.log('  Studio Owner: owner@demo-studio.com / Owner123!');
        console.log('  Fotógrafo: fotografo@demo-studio.com / Foto123!\n');
        console.log('🔗 URLs de acceso:');
        console.log('  Admin: /admin');
        console.log('  Studio: /demo-studio');
        console.log('  Agente: /agente\n');

    } catch (error) {
        console.error('❌ Error en seed de usuarios demo:', error);
        throw error;
    }
}

// ============================================
// CREAR USUARIOS EN SUPABASE AUTH
// ============================================

async function createSupabaseUsers() {
    console.log('🔐 Creando usuarios en Supabase Auth...');

    for (const user of DEMO_USERS) {
        try {
            // Crear usuario en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true, // Confirmar email automáticamente
                user_metadata: {
                    full_name: user.full_name,
                    phone: user.phone,
                },
            });

            if (authError) {
                console.log(`  ⚠️  Usuario ${user.email} ya existe en Supabase`);
                continue;
            }

            console.log(`  ✅ ${user.email} creado en Supabase Auth`);
        } catch (error) {
            console.log(`  ⚠️  Error creando ${user.email} en Supabase:`, error);
        }
    }
}

// ============================================
// CREAR REGISTROS EN BASE DE DATOS
// ============================================

async function createDatabaseUsers() {
    console.log('💾 Creando registros en base de datos...');

    for (const user of DEMO_USERS) {
        try {
            // Obtener supabase_id del usuario creado
            const { data: authUser } = await supabase.auth.admin.getUserByEmail(user.email);

            if (!authUser?.user?.id) {
                console.log(`  ⚠️  No se encontró usuario ${user.email} en Supabase`);
                continue;
            }

            // Crear usuario en base de datos
            const dbUser = await prisma.users.upsert({
                where: { email: user.email },
                update: {
                    supabase_id: authUser.user.id,
                    full_name: user.full_name,
                    phone: user.phone,
                    is_active: true,
                },
                create: {
                    supabase_id: authUser.user.id,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    is_active: true,
                },
            });

            // Asignar rol de plataforma
            await prisma.user_platform_roles.upsert({
                where: {
                    user_id_role: {
                        user_id: dbUser.id,
                        role: user.platform_role,
                    },
                },
                update: {},
                create: {
                    user_id: dbUser.id,
                    role: user.platform_role,
                    is_active: true,
                    granted_at: new Date(),
                },
            });

            // Asignar rol en studio (si aplica)
            if (user.studio_role) {
                await prisma.user_studio_roles.upsert({
                    where: {
                        user_id_studio_id_role: {
                            user_id: dbUser.id,
                            studio_id: DEMO_STUDIO_ID,
                            role: user.studio_role,
                        },
                    },
                    update: {},
                    create: {
                        user_id: dbUser.id,
                        studio_id: DEMO_STUDIO_ID,
                        role: user.studio_role,
                        is_active: true,
                        invited_at: new Date(),
                        accepted_at: new Date(),
                    },
                });

                // Crear o actualizar studio_user_profiles con supabase_id
                await prisma.studio_user_profiles.upsert({
                    where: { email: user.email },
                    update: {
                        supabase_id: authUser.user.id,
                        full_name: user.full_name,
                        studio_id: DEMO_STUDIO_ID,
                        role: user.platform_role,
                        is_active: true,
                    },
                    create: {
                        email: user.email,
                        supabase_id: authUser.user.id,
                        full_name: user.full_name,
                        studio_id: DEMO_STUDIO_ID,
                        role: user.platform_role,
                        is_active: true,
                    },
                });
            }

            console.log(`  ✅ ${user.email} - ${user.full_name} (${user.platform_role}${user.studio_role ? ` + ${user.studio_role}` : ''})`);

        } catch (error) {
            console.error(`  ❌ Error creando ${user.email}:`, error);
        }
    }
}

// ============================================
// EXECUTE
// ============================================

main()
    .catch((e) => {
        console.error('❌ Error en seed de usuarios demo:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
