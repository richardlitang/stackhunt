/**
 * Test Keyword Parser with User's 10 Example Keywords
 */

import 'dotenv/config';
import { parseKeywordIntent } from '../src/lib/hunter/services/keyword-parser.js';

const testKeywords = [
  'best seo tools for startups',
  'twenty crm review',
  'tally review',
  'typeform alternatives',
  'convertkit vs mailchimp',
  'activecampaign alternatives',
  'best social media schedulers',
  'best affiliate tracking software',
  'discord vs slack for work',
  'bench accounting review',
];

async function testParser() {
  console.log('🧪 Testing Gemini Keyword Parser\n');
  console.log('═'.repeat(70));

  for (const keyword of testKeywords) {
    console.log(`\n📌 Keyword: "${keyword}"`);

    try {
      const intent = await parseKeywordIntent(keyword);

      console.log(`   Type: ${intent.type}`);
      console.log(`   Tools: ${intent.tools.join(', ') || 'none'}`);
      console.log(`   Context: ${intent.context || 'none'}`);
      console.log(`   Category: ${intent.category || 'none'}`);
      console.log(`   Actions (${intent.actionPlan.length}):`);

      intent.actionPlan.forEach((action, idx) => {
        console.log(`     ${idx + 1}. ${action.type}`);
        const params = Object.entries(action.params)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(', ');
        if (params) {
          console.log(`        ${params}`);
        }
      });

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ Test complete!');
}

testParser().catch(console.error);
