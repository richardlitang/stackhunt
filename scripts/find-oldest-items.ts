import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';
import { buildFreshnessMap } from './lib/hunt-freshness.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findOldestItems() {
  // Get items in queue
  const { data: queueItems, error: queueError } = await supabase
    .from('hunt_queue')
    .select('tool_name, status, priority')
    .eq('status', 'pending')
    .order('priority', { ascending: false });

  if (queueError) {
    console.error('Queue error:', queueError);
    return;
  }

  const queuedToolNames = new Set(queueItems?.map(q => q.tool_name) || []);

  // Get candidate items
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name')
    .order('name', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const freshness = await buildFreshnessMap(
    supabase,
    (items || []).map((item) => item.name),
    { cooldownHours: 24 }
  );

  const ranked = (items || [])
    .map((item) => {
      const basis = freshness.get(item.name);
      return {
        name: item.name,
        inQueue: queuedToolNames.has(item.name),
        ageDays: basis?.ageDays ?? null,
        priority: basis?.priority ?? 50,
        reason: basis?.reason ?? 'missing_basis',
        basisAt: basis?.freshnessBasisAt ?? null,
      };
    })
    .sort((a, b) => {
      const aNever = a.basisAt === null ? 1 : 0;
      const bNever = b.basisAt === null ? 1 : 0;
      if (aNever !== bNever) return bNever - aNever;
      const aAge = a.ageDays ?? -1;
      const bAge = b.ageDays ?? -1;
      return bAge - aAge;
    });

  console.log('\n📅 Oldest items by canonical freshness basis:\n');
  ranked.forEach((item, idx) => {
    const ageLabel = item.ageDays === null ? 'n/a' : `${item.ageDays}d`;
    const basisLabel = item.basisAt ? item.basisAt.slice(0, 19).replace('T', ' ') : 'none';
    console.log(
      `${idx + 1}. ${item.name.padEnd(30)} - ${ageLabel.padStart(7)} | p=${String(item.priority).padStart(3)} | ${item.reason} | basis=${basisLabel} ${item.inQueue ? '✓ queued' : '❌ NOT queued'}`
    );
  });

  // Count how many oldest items are NOT in queue
  const notQueued = ranked.filter((item) => !item.inQueue);
  console.log(`\n⚠️  ${notQueued.length} of the 50 oldest items are NOT in the queue`);
}

findOldestItems();
