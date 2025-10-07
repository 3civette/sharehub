// Apply migrations using Supabase client
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from backend/.env
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  console.log('🚀 Applying ShareHub Dashboard Migrations...\n');

  // Read migration files
  const migration1 = readFileSync(join(__dirname, '../migrations/001_create_activity_logs.sql'), 'utf-8');
  const migration2 = readFileSync(join(__dirname, '../migrations/002_add_branding_and_tokens.sql'), 'utf-8');

  try {
    console.log('📝 Executing Migration 001: Create activity_logs table...');

    // Execute migration 1
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: migration1
    });

    if (error1) {
      console.log('⚠️  Migration 001 result:', error1.message);
    } else {
      console.log('✅ Migration 001 completed');
    }

    console.log('\n📝 Executing Migration 002: Add branding and tokens...');

    // Execute migration 2
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: migration2
    });

    if (error2) {
      console.log('⚠️  Migration 002 result:', error2.message);
    } else {
      console.log('✅ Migration 002 completed');
    }

    console.log('\n🎉 Migration process complete!\n');
    console.log('Verify in Supabase Dashboard:');
    console.log('  - Check activity_logs table exists');
    console.log('  - Check tenants.branding_config column');
    console.log('  - Check events token columns\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📋 Fallback: Apply migrations manually via Supabase SQL Editor');
    console.log('   See APPLY_MIGRATIONS.md for instructions\n');
  }
}

applyMigrations();
