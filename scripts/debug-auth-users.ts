/**
 * DEBUG AUTH USERS
 * 
 * Verifica el estado de los usuarios en Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔍 Verificando usuarios en Supabase Auth...\n');

  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error listando usuarios:', error);
      return;
    }

    if (!data?.users || data.users.length === 0) {
      console.log('⚠️  No hay usuarios en Supabase Auth');
      return;
    }

    console.log(`✅ ${data.users.length} usuarios encontrados:\n`);

    for (const user of data.users) {
      console.log('─────────────────────────────────────');
      console.log(`📧 Email: ${user.email}`);
      console.log(`🆔 ID: ${user.id}`);
      console.log(`✅ Email confirmado: ${user.email_confirmed_at ? 'SÍ' : 'NO'}`);
      console.log(`📅 Creado: ${user.created_at}`);
      console.log(`🔐 Último login: ${user.last_sign_in_at || 'Nunca'}`);
      console.log(`📝 Metadata:`, JSON.stringify(user.user_metadata, null, 2));
      console.log(`🔒 App metadata:`, JSON.stringify(user.app_metadata, null, 2));
      console.log(`🎯 Role: ${user.role || 'No role'}`);
      console.log(`⏰ Updated: ${user.updated_at}`);
      console.log('');
    }

    console.log('─────────────────────────────────────\n');

    // Intentar login de prueba con el usuario owner
    console.log('🧪 Intentando login de prueba con owner@demo-studio.com...\n');
    
    // Usar client sin service role key para simular login real
    const publicClient = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: loginData, error: loginError } = await publicClient.auth.signInWithPassword({
      email: 'owner@demo-studio.com',
      password: 'Owner123!',
    });

    if (loginError) {
      console.error('❌ Error en login de prueba:', loginError);
      console.error('   Código:', loginError.status);
      console.error('   Mensaje:', loginError.message);
    } else {
      console.log('✅ Login exitoso!');
      console.log('   User ID:', loginData.user?.id);
      console.log('   Session:', loginData.session ? 'Creada' : 'No creada');
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

main()
  .then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

