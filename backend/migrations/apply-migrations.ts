import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  const migrations = [
    '001_create_activity_logs.sql',
    '002_add_branding_and_tokens.sql'
  ];

  for (const migration of migrations) {
    console.log(`Applying migration: ${migration}...`);

    const sql = readFileSync(join(__dirname, migration), 'utf-8');

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ Error applying ${migration}:`, error);
      process.exit(1);
    }

    console.log(`✅ ${migration} applied successfully`);
  }

  console.log('\n🎉 All migrations applied successfully!');
}

applyMigrations();
