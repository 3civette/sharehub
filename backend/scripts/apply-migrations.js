/**
 * Apply Feature 005 migrations to Supabase
 * Run with: node scripts/apply-migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(filename) {
  console.log(`\n📄 Applying migration: ${filename}`);

  const migrationPath = path.join(__dirname, '..', 'migrations', filename);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ Error applying ${filename}:`, error.message);
      return false;
    }

    console.log(`✅ Successfully applied ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception applying ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Feature 005 migration process...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  const migrations = [
    '005-event-photos.sql',
    '005-sessions.sql',
    '005-speeches.sql',
    '005-slides-enhancement.sql'
  ];

  let successCount = 0;

  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (success) successCount++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Migration complete: ${successCount}/${migrations.length} migrations applied`);

  if (successCount === migrations.length) {
    console.log('🎉 All migrations applied successfully!');
  } else {
    console.log('⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
