import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkContentIdeas() {
  // Check content_ideas table for approved items
  const { data: ideas, error } = await supabase
    .from('content_ideas')
    .select('*')
    .order('roi_score', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 Content Ideas Summary (${ideas?.length} total):\n`);

  // Group by status
  const byStatus = ideas?.reduce((acc, idea) => {
    const status = idea.status || 'unknown';
    if (!acc[status]) acc[status] = [];
    acc[status].push(idea);
    return acc;
  }, {} as Record<string, any[]>) || {};

  Object.entries(byStatus).forEach(([status, items]) => {
    console.log(`${status.toUpperCase()}: ${items.length} items`);
  });

  // Show approved items ready to queue
  const approved = ideas?.filter(i => i.status === 'approved') || [];
  if (approved.length > 0) {
    console.log(`\n✅ APPROVED items ready to queue (${approved.length}):`);
    approved.slice(0, 20).forEach((idea, idx) => {
      console.log(`  ${idx + 1}. ${idea.keyword} (ROI: ${idea.roi_score}, tool: ${idea.tool_name || 'unknown'})`);
    });
    if (approved.length > 20) {
      console.log(`  ... and ${approved.length - 20} more`);
    }
  }

  // Show pending items
  const pending = ideas?.filter(i => i.status === 'pending') || [];
  if (pending.length > 0) {
    console.log(`\n⏳ PENDING items (${pending.length}):`);
    pending.slice(0, 10).forEach((idea, idx) => {
      console.log(`  ${idx + 1}. ${idea.keyword} (ROI: ${idea.roi_score})`);
    });
  }

  return { approved, pending, byStatus };
}

checkContentIdeas();
