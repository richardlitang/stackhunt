#!/usr/bin/env npx tsx
/**
 * Backfill Sub-Category Script
 *
 * Classifies existing tools into sub-categories to improve comparison quality.
 * Prevents "apples to oranges" comparisons like Twilio (API) vs Slack (Chat).
 *
 * Usage:
 *   npx tsx scripts/backfill-subcategory.ts --dry-run     # Preview changes
 *   npx tsx scripts/backfill-subcategory.ts               # Apply changes
 *   npx tsx scripts/backfill-subcategory.ts --limit 10    # Process 10 tools
 *   npx tsx scripts/backfill-subcategory.ts --category "Communication"  # Only specific category
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Sub-category definitions for each primary function
const SUB_CATEGORY_DEFINITIONS: Record<string, string[]> = {
  'Communication': [
    'Team Chat',           // Slack, Discord, Microsoft Teams
    'Video Conferencing',  // Zoom, Google Meet, Webex
    'CPaaS',               // Twilio, Vonage, Plivo - Communication Platform as a Service (APIs)
    'Email Client',        // Gmail, Outlook, Superhuman
    'VoIP',                // RingCentral, Dialpad - Voice over IP phone systems
    'Async Video',         // Loom, Vidyard - async video messaging
  ],
  'Marketing': [
    'Marketing Automation',  // HubSpot Marketing, Marketo, Pardot
    'Email Marketing',       // Mailchimp, Klaviyo, ConvertKit - campaign-focused
    'Email Service Provider', // SendGrid, Mailgun, Postmark - API/transactional
    'Ad Platform',           // Google Ads, Meta Ads, LinkedIn Ads
    'Social Media Management', // Hootsuite, Buffer, Sprout Social
    'SEO Tools',             // Ahrefs, SEMrush, Moz
    'Analytics',             // Google Analytics, Mixpanel, Amplitude
    'CRO/AB Testing',        // Optimizely, VWO, AB Tasty
  ],
  'CRM': [
    'Sales CRM',           // Salesforce, Pipedrive, Close
    'Support CRM',         // Zendesk, Freshdesk, Intercom
    'All-in-one CRM',      // HubSpot CRM, Zoho CRM
    'Customer Data Platform', // Segment, mParticle
  ],
  'Project Management': [
    'Task Management',     // Asana, Todoist, ClickUp
    'Kanban/Agile',        // Trello, Jira, Linear
    'Resource Planning',   // Monday.com, Smartsheet, Teamwork
    'Product Roadmap',     // Productboard, Aha!, Airfocus
  ],
  'Documentation': [
    'Knowledge Base',      // Notion, Confluence, GitBook
    'Note Taking',         // Obsidian, Roam, Bear
    'Wiki',                // Slite, Tettra, Guru
    'Technical Docs',      // ReadMe, Docusaurus, MkDocs
  ],
  'Data': [
    'Data Warehouse',      // Snowflake, BigQuery, Redshift
    'ETL/ELT',             // Fivetran, Airbyte, Stitch
    'BI Dashboard',        // Metabase, Looker, Tableau
    'Data Catalog',        // Atlan, Alation, DataHub
    'Reverse ETL',         // Census, Hightouch
  ],
  'Developer Tools': [
    'IDE/Code Editor',     // VS Code, JetBrains, Cursor
    'Version Control',     // GitHub, GitLab, Bitbucket
    'CI/CD',               // CircleCI, GitHub Actions, Jenkins
    'API Platform',        // Postman, Insomnia, RapidAPI
    'Error Tracking',      // Sentry, Bugsnag, Rollbar
    'Logging/Monitoring',  // Datadog, New Relic, Grafana
    'Feature Flags',       // LaunchDarkly, Split, Flagsmith
  ],
  'Cloud Infrastructure': [
    'Cloud Provider',      // AWS, GCP, Azure
    'Serverless',          // Vercel, Netlify, Railway
    'Container Platform',  // Docker, Kubernetes, ECS
    'Database Service',    // PlanetScale, Supabase, Neon
    'CDN',                 // Cloudflare, Fastly, Akamai
  ],
  'Design': [
    'UI Design',           // Figma, Sketch, Adobe XD
    'Prototyping',         // InVision, Principle, ProtoPie
    'Design System',       // Storybook, Zeroheight
    'Asset Management',    // Brandfetch, Noun Project
    'Video Editing',       // Descript, Kapwing, Runway
    'Graphic Design',      // Canva, Adobe Express
    'Illustration',        // Procreate, Adobe Illustrator
  ],
  'Finance': [
    'Accounting',          // QuickBooks, Xero, FreshBooks
    'Expense Management',  // Expensify, Brex, Ramp
    'Billing/Subscriptions', // Stripe Billing, Chargebee, Recurly
    'Payment Processing',  // Stripe, Square, PayPal
    'Financial Planning',  // Mosaic, Jirav, Cube
    'Business Banking',    // Mercury, Relay, Brex
    'International Payments', // Wise, Payoneer, Remitly
  ],
  'HR': [
    'HRIS',                // BambooHR, Rippling, Gusto
    'ATS/Recruiting',      // Greenhouse, Lever, Ashby
    'Performance Management', // Lattice, 15Five, Culture Amp
    'Payroll',             // Gusto, Deel, Remote
    'Learning Management', // Lessonly, Trainual, WorkRamp
  ],
  'Sales': [
    'Sales Engagement',    // Outreach, Salesloft, Apollo
    'Revenue Intelligence', // Gong, Chorus, Clari
    'CPQ',                 // Salesforce CPQ, DealHub, PandaDoc
    'E-signature',         // DocuSign, HelloSign, PandaDoc
  ],
  'Customer Success': [
    'Customer Success Platform', // Gainsight, ChurnZero, Totango
    'Help Desk',           // Zendesk, Freshdesk, Help Scout
    'Live Chat',           // Intercom, Drift, Crisp
    'Knowledge Base',      // Zendesk Guide, Helpjuice
  ],
  'Security': [
    'Identity/SSO',        // Okta, Auth0, OneLogin
    'Password Management', // 1Password, LastPass, Dashlane
    'Endpoint Security',   // CrowdStrike, SentinelOne
    'SIEM',                // Splunk, Sumo Logic, Elastic
    'Compliance',          // Drata, Vanta, Secureframe
  ],
  'AI/ML': [
    'LLM API',             // OpenAI, Anthropic, Cohere
    'ML Platform',         // Hugging Face, Replicate, Modal
    'AI Writing',          // Jasper, Copy.ai, Writer
    'AI Coding',           // GitHub Copilot, Cursor, Tabnine
    'Vector Database',     // Pinecone, Weaviate, Qdrant
    'AI Image Generation', // Midjourney, DALL-E, Stable Diffusion
  ],
  'AI Tools': [
    'AI Writing',          // Jasper, Copy.ai, Writer
    'AI Coding',           // GitHub Copilot, Cursor, Tabnine
    'AI Image Generation', // Midjourney, DALL-E, Stable Diffusion
    'AI Video',            // Runway, Pika, HeyGen
    'AI Assistant',        // ChatGPT, Claude, Gemini
  ],
  'AI Code Assistant': [
    'Code Completion',     // GitHub Copilot, Tabnine, Codeium
    'AI IDE',              // Cursor, Windsurf, Replit
    'Code Review',         // CodeRabbit, Sourcery
  ],
  'Productivity': [
    'Time Tracking',       // Toggl, Clockify, Harvest
    'Focus/Pomodoro',      // Forest, Focus@Will
    'Calendar',            // Calendly, SavvyCal, Cal.com
    'Task Lists',          // Todoist, Things, TickTick
    'Note Taking',         // Notion, Obsidian, Roam
  ],
  'Automation Platform': [
    'No-Code Automation',  // Zapier, Make, n8n
    'Workflow Orchestration', // Temporal, Prefect, Airflow
    'RPA',                 // UiPath, Automation Anywhere
  ],
  'Accounting Software': [
    'Small Business',      // QuickBooks, FreshBooks, Wave
    'Mid-Market',          // Xero, Sage
    'Enterprise',          // NetSuite, SAP
  ],
  'SEO Tools': [
    'All-in-one SEO',      // Ahrefs, SEMrush, Moz
    'Keyword Research',    // Keywords Everywhere, Ubersuggest
    'Rank Tracking',       // AccuRanker, SERPWatcher
    'Technical SEO',       // Screaming Frog, Sitebulb
  ],
  'Business Banking': [
    'Startup Banking',     // Mercury, Relay, Brex
    'International',       // Wise Business, Payoneer
    'Traditional',         // Chase, Bank of America
  ],
  'Virtual Assistant': [
    'Executive Assistant', // BELAY, Time Etc
    'Sales Development',   // Belkins, CIENCE
    'Customer Service',    // PartnerHero, SupportNinja
  ],
};

// Build the classification prompt
function buildClassificationPrompt(
  toolName: string,
  primaryFunction: string,
  metadata: Record<string, unknown>
): string {
  const subCategories = SUB_CATEGORY_DEFINITIONS[primaryFunction] || [];

  if (subCategories.length === 0) {
    return ''; // No sub-categories defined for this primary function
  }

  return `You are classifying software tools into sub-categories for comparison purposes.

Tool: "${toolName}"
Primary Category: "${primaryFunction}"

Available Sub-Categories for ${primaryFunction}:
${subCategories.map((sc, i) => `${i + 1}. ${sc}`).join('\n')}

Tool Metadata (for context):
${JSON.stringify(metadata, null, 2)}

TASK: Select the SINGLE most appropriate sub-category for this tool.

RULES:
1. Choose based on the tool's PRIMARY function, not secondary features
2. If it's an API/developer platform, classify it as such (e.g., "CPaaS" for Twilio, "Email Service Provider" for SendGrid)
3. If it's an end-user application, classify it as such (e.g., "Team Chat" for Slack)
4. If none fit well, respond with "Other"

Respond with ONLY the sub-category name, nothing else. Example response:
Team Chat`;
}

interface ToolToClassify {
  id: string;
  name: string;
  specs: {
    taxonomy?: {
      primary_function?: string;
      sub_category?: string | null;
    };
    pricing_data?: {
      model?: string;
    };
  };
  metadata?: Record<string, unknown>;
}

async function classifyTool(
  tool: ToolToClassify
): Promise<string | null> {
  const primaryFunction = tool.specs?.taxonomy?.primary_function;

  if (!primaryFunction) {
    console.log(`  ⚠️  ${tool.name}: No primary_function, skipping`);
    return null;
  }

  const subCategories = SUB_CATEGORY_DEFINITIONS[primaryFunction];
  if (!subCategories || subCategories.length === 0) {
    console.log(`  ⚠️  ${tool.name}: No sub-categories defined for "${primaryFunction}"`);
    return null;
  }

  const prompt = buildClassificationPrompt(
    tool.name,
    primaryFunction,
    {
      pricing_model: tool.specs?.pricing_data?.model,
      ...tool.metadata,
    }
  );

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Validate response is one of the valid sub-categories
    if (subCategories.includes(response)) {
      return response;
    } else if (response === 'Other') {
      return null;
    } else {
      // Try to find a close match
      const lowerResponse = response.toLowerCase();
      const match = subCategories.find(sc =>
        sc.toLowerCase() === lowerResponse ||
        sc.toLowerCase().includes(lowerResponse) ||
        lowerResponse.includes(sc.toLowerCase())
      );
      if (match) {
        return match;
      }
      console.log(`  ⚠️  ${tool.name}: Invalid response "${response}", expected one of: ${subCategories.join(', ')}`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ ${tool.name}: Gemini error:`, error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : 100;
  const categoryArg = args.find(a => a.startsWith('--category'));
  const filterCategory = categoryArg ? (categoryArg.split('=')[1] || args[args.indexOf('--category') + 1]) : null;

  console.log('🔄 Sub-Category Backfill Script');
  console.log('================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log(`Limit: ${limit} tools`);
  if (filterCategory) console.log(`Category filter: ${filterCategory}`);
  console.log('');

  // Fetch tools missing sub_category
  let query = supabase
    .from('items')
    .select('id, name, specs, metadata')
    .is('specs->taxonomy->sub_category', null)
    .not('specs->taxonomy->primary_function', 'is', null)
    .limit(limit);

  if (filterCategory) {
    query = query.eq('specs->taxonomy->primary_function', filterCategory);
  }

  const { data: tools, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch tools:', error);
    process.exit(1);
  }

  if (!tools || tools.length === 0) {
    console.log('✅ No tools need sub-category classification!');
    return;
  }

  console.log(`Found ${tools.length} tools to classify\n`);

  const results = {
    classified: 0,
    skipped: 0,
    errors: 0,
  };

  for (const tool of tools as ToolToClassify[]) {
    const primaryFunction = tool.specs?.taxonomy?.primary_function;
    console.log(`📦 ${tool.name} (${primaryFunction})`);

    const subCategory = await classifyTool(tool);

    if (subCategory) {
      console.log(`   → ${subCategory}`);

      if (!dryRun) {
        // Update the database
        const updatedSpecs = {
          ...tool.specs,
          taxonomy: {
            ...tool.specs.taxonomy,
            sub_category: subCategory,
          },
        };

        const { error: updateError } = await supabase
          .from('items')
          .update({ specs: updatedSpecs })
          .eq('id', tool.id);

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError);
          results.errors++;
        } else {
          results.classified++;
        }
      } else {
        results.classified++;
      }
    } else {
      results.skipped++;
    }

    // Rate limiting - avoid hitting Gemini too fast
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n================================');
  console.log('📊 Results:');
  console.log(`   Classified: ${results.classified}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Errors: ${results.errors}`);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);
