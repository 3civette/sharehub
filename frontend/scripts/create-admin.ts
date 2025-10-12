import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'meeting@3civette.it',
      password: 'Pwd.3Civette!',
      email_confirm: true,
      user_metadata: {
        full_name: '3Civette Admin'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      process.exit(1);
    }

    console.log('✅ User created in auth:', authData.user.id);

    // Create admin entry in admins table
    const { error: adminError } = await supabaseAdmin
      .from('admins')
      .insert({
        id: authData.user.id,
        tenant_id: '523c2648-f980-4c9e-8e53-93d812cfa79f',
        email: 'meeting@3civette.it',
        full_name: '3Civette Admin',
        role: 'owner'
      });

    if (adminError) {
      console.error('Admin table error:', adminError);
      process.exit(1);
    }

    console.log('✅ Admin entry created');
    console.log('\n🎉 Admin user ready:');
    console.log('   Email: meeting@3civette.it');
    console.log('   Password: Pwd.3Civette!');
    console.log('   Role: owner');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

createAdmin();
