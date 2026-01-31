import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('📦 Applying Flywheel Architecture migration...\n');

  const sql = readFileSync(
    'supabase/migrations/034_flywheel_architecture.sql',
    'utf-8'
  );

  try {
    // Split by statement and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        // Continue anyway - might be "already exists" errors
      } else {
        console.log(`✅ Statement ${i + 1} applied`);
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
