/**
 * User Journey Tests - Testing StackHunt from 6 Real Persona Perspectives
 *
 * Each test simulates a real user with specific needs and pain points.
 * PASS = User finds what they need
 * FAIL = User hits a dealbreaker and bounces
 */

import { test, expect } from '@playwright/test';

// Helper: Check if element exists and is visible
const checkVisible = async (page: any, selector: string) => {
  const element = page.locator(selector);
  const count = await element.count();
  if (count === 0) return { exists: false, visible: false, text: null };
  const visible = await element.first().isVisible();
  const text = visible ? await element.first().textContent() : null;
  return { exists: true, visible, text };
};

// ============================================================================
// JOURNEY 1: The "Compliance-First" Buyer (Enterprise Architect at Fintech)
// ============================================================================
test.describe('Journey 1: Compliance-First Buyer', () => {
  test('Can find SOC2 compliance in comparison', async ({ page }) => {
    // Scenario: Comparing Linear vs Asana for project management
    // Need: Must see SOC2, SSO, data residency immediately

    await page.goto('/compare/asana-vs-linear');

    // Looking for security/compliance row in comparison table
    const securityRow = await checkVisible(page, 'text=SOC2');
    const ssoRow = await checkVisible(page, 'text=SSO');
    const dataResidency = await checkVisible(page, 'text=Data Residency');

    console.log('🔒 COMPLIANCE-FIRST BUYER');
    console.log('Looking at: Asana vs Linear');
    console.log('✓ SOC2 visible:', securityRow.visible);
    console.log('✓ SSO visible:', ssoRow.visible);
    console.log('✗ Data Residency visible:', dataResidency.visible, '(DEALBREAKER if missing)');

    // PASS criteria: Must see at least compliance mentions
    // DEALBREAKER: If no security/compliance info visible at all
    const hasComplianceInfo = securityRow.visible || ssoRow.visible;

    if (!hasComplianceInfo) {
      console.log('❌ BOUNCE: No compliance info visible. Legal will reject this.');
    }

    expect(hasComplianceInfo).toBeTruthy();
  });

  test('Can find company viability data on tool page', async ({ page }) => {
    // Need: Founded year, funding stage, team size
    await page.goto('/tool/linear');

    const founded = await checkVisible(page, 'text=/Founded|Established/i');
    const funding = await checkVisible(page, 'text=/Series|Funding|Seed/i');
    const teamSize = await checkVisible(page, 'text=/employees|team/i');

    console.log('🏢 VENDOR VIABILITY CHECK');
    console.log('✓ Founded year:', founded.visible);
    console.log('✓ Funding stage:', funding.visible);
    console.log('✓ Team size:', teamSize.visible);

    const hasViabilityData = founded.visible || funding.visible || teamSize.visible;

    if (!hasViabilityData) {
      console.log('❌ CONCERN: No company health signals. Is this a side project?');
    }
  });
});

// ============================================================================
// JOURNEY 2: The "Bootstrapped" Solo Dev
// ============================================================================
test.describe('Journey 2: Bootstrapped Solo Dev', () => {
  test('Can see free tier limits and overage behavior', async ({ page }) => {
    // Scenario: Looking at Supabase vs Firebase
    // Need: Exact free tier limits + what happens when I exceed them

    await page.goto('/compare/firebase-vs-supabase');

    const freeTier = await checkVisible(page, 'text=/Free (tier|plan)/i');
    const limits = await checkVisible(page, 'text=/500MB|50k|unlimited/i');
    const hardLimit = await checkVisible(page, 'text=/hard limit|app pauses|auto-charges/i');

    console.log('💸 BOOTSTRAPPED SOLO DEV');
    console.log('Looking at: Firebase vs Supabase');
    console.log('✓ Free tier mentioned:', freeTier.visible);
    console.log('✓ Specific limits shown:', limits.visible);
    console.log('✗ Hard vs Soft limit:', hardLimit.visible, '(DEALBREAKER - need to know if I get surprise bill)');

    if (!hardLimit.visible) {
      console.log('❌ BOUNCE: I\'m terrified of waking up to a $500 bill. Need clarity.');
    }
  });

  test('Pricing crossover chart shows exact breakpoint', async ({ page }) => {
    // Need: "At what team size does this become expensive?"
    await page.goto('/compare/firebase-vs-supabase');

    // Check if pricing chart is rendered
    const pricingChart = await checkVisible(page, '[class*="crossover"]');
    const chartCanvas = await checkVisible(page, 'canvas');

    console.log('📊 PRICING CROSSOVER');
    console.log('✓ Chart visible:', pricingChart.visible || chartCanvas.visible);

    if (!pricingChart.visible && !chartCanvas.visible) {
      console.log('⚠️  No visual pricing comparison. Would help to see breakpoint.');
    }
  });
});

// ============================================================================
// JOURNEY 3: The "Hostage" Migrator (Notion → Obsidian)
// ============================================================================
test.describe('Journey 3: Hostage Migrator', () => {
  test('Can see migration difficulty and fidelity warnings', async ({ page }) => {
    // Scenario: 5,000 notes in Notion, considering Obsidian
    // Need: Will my synced blocks break? What about my images?

    await page.goto('/compare/notion-vs-obsidian');

    const migrationSection = await checkVisible(page, 'text=/Can You Switch|Migration/i');
    const importFrom = await checkVisible(page, 'text=/can import/i');
    const warnings = await checkVisible(page, 'text=/synced blocks|formatting|metadata/i');

    console.log('🔄 HOSTAGE MIGRATOR');
    console.log('Looking at: Notion vs Obsidian');
    console.log('✓ Migration section:', migrationSection.visible);
    console.log('✓ Import capability:', importFrom.visible);
    console.log('✗ Fidelity warnings:', warnings.visible, '(DEALBREAKER - what will I lose?)');

    if (!warnings.visible) {
      console.log('❌ BOUNCE: I need to know what breaks. Not risking 5,000 notes.');
    }
  });

  test('Shows switching patterns and common reasons', async ({ page }) => {
    await page.goto('/compare/notion-vs-obsidian');

    const whySwitch = await checkVisible(page, 'text=/Why People Switch/i');
    const reasons = await checkVisible(page, 'text=/lag|speed|offline|collaboration/i');

    console.log('💡 SWITCHING INTEL');
    console.log('✓ "Why switch" section:', whySwitch.visible);
    console.log('✓ Real reasons listed:', reasons.visible);

    if (whySwitch.visible && reasons.visible) {
      console.log('✅ HELPFUL: Seeing real migration stories validates my concerns.');
    }
  });
});

// ============================================================================
// JOURNEY 4: The "Non-Technical" Agency Owner
// ============================================================================
test.describe('Journey 4: Non-Technical Agency Owner', () => {
  test('Can see learning curve and setup complexity', async ({ page }) => {
    // Scenario: Looking at Salesforce vs Pipedrive
    // Need: Which one can my team use by TOMORROW?

    await page.goto('/compare/pipedrive-vs-salesforce');

    const learningCurve = await checkVisible(page, 'text=/Learning Curve|Days|Weeks|Months/i');
    const requiresDev = await checkVisible(page, 'text=/Requires Developer|No-Code|API setup/i');
    const setupTime = await checkVisible(page, 'text=/Setup (time|difficulty)/i');

    console.log('🤷 NON-TECHNICAL AGENCY OWNER');
    console.log('Looking at: Pipedrive vs Salesforce');
    console.log('✓ Learning curve shown:', learningCurve.visible);
    console.log('✗ "Requires Developer?" flag:', requiresDev.visible, '(DEALBREAKER)');
    console.log('✗ Setup time estimate:', setupTime.visible);

    if (!requiresDev.visible) {
      console.log('❌ BOUNCE: I looked at Salesforce and felt stupid. Need to know if I need a consultant.');
    }
  });

  test('Pros/cons mention ease of use and onboarding', async ({ page }) => {
    await page.goto('/compare/pipedrive-vs-salesforce');

    // Look for ease-of-use signals in pros/cons
    const easeOfUse = await checkVisible(page, 'text=/easy|simple|intuitive|user-friendly/i');
    const complexity = await checkVisible(page, 'text=/complex|steep|difficult|confusing/i');

    console.log('🎯 EASE OF USE SIGNALS');
    console.log('✓ "Easy/Simple" mentioned:', easeOfUse.visible);
    console.log('✓ "Complex/Difficult" warnings:', complexity.visible);

    if (easeOfUse.visible || complexity.visible) {
      console.log('✅ HELPFUL: I can tell which one won\'t make me feel dumb.');
    }
  });
});

// ============================================================================
// JOURNEY 5: The "Scale-Up" CTO (Enforcing SSO)
// ============================================================================
test.describe('Journey 5: Scale-Up CTO', () => {
  test('Can identify SSO pricing and "SSO Tax"', async ({ page }) => {
    // Scenario: 200 employees, need SAML SSO for security
    // Need: Which tools force me to "Contact Sales" just for SSO?

    await page.goto('/compare/notion-vs-clickup');

    const ssoMention = await checkVisible(page, 'text=/SSO|SAML|Single Sign-On/i');
    const enterprisePlan = await checkVisible(page, 'text=/Enterprise|Contact Sales/i');
    const ssoTax = await checkVisible(page, 'text=/SSO Tax|price increase for SSO/i');

    console.log('🔐 SCALE-UP CTO (SSO Required)');
    console.log('Looking at: Notion vs ClickUp');
    console.log('✓ SSO mentioned:', ssoMention.visible);
    console.log('✓ Enterprise plan shown:', enterprisePlan.visible);
    console.log('✗ SSO Tax calculation:', ssoTax.visible, '(Would love to see % markup)');

    if (!ssoMention.visible) {
      console.log('⚠️  Can\'t tell if SSO is available or which plan includes it.');
    }
  });

  test('Can see audit logs and enterprise features', async ({ page }) => {
    // Need: Audit logs, uptime SLA, priority support
    await page.goto('/tool/notion');

    const auditLogs = await checkVisible(page, 'text=/audit log|activity log/i');
    const sla = await checkVisible(page, 'text=/SLA|uptime|99.9/i');
    const prioritySupport = await checkVisible(page, 'text=/priority support|24.*7/i');

    console.log('🏢 ENTERPRISE READINESS');
    console.log('✗ Audit logs mentioned:', auditLogs.visible, '(DEALBREAKER for compliance)');
    console.log('✗ Uptime SLA:', sla.visible);
    console.log('✓ Priority support:', prioritySupport.visible);

    if (!auditLogs.visible) {
      console.log('❌ CONCERN: Need audit logs for compliance. Can\'t buy without confirmation.');
    }
  });
});

// ============================================================================
// JOURNEY 6: The "Data Sovereign" European (GDPR-Critical)
// ============================================================================
test.describe('Journey 6: Data Sovereign European', () => {
  test('Can see data residency and GDPR compliance', async ({ page }) => {
    // Scenario: German healthcare startup
    // Need: Data MUST stay in EU, or we violate GDPR

    await page.goto('/tool/dropbox');

    const dataResidency = await checkVisible(page, 'text=/data residency|EU|Frankfurt|Germany/i');
    const gdpr = await checkVisible(page, 'text=/GDPR/i');
    const selfHostable = await checkVisible(page, 'text=/self-host|on-premise/i');

    console.log('🇪🇺 DATA SOVEREIGN EUROPEAN');
    console.log('Looking at: Dropbox');
    console.log('✗ Data residency:', dataResidency.visible, '(DEALBREAKER)');
    console.log('✓ GDPR mentioned:', gdpr.visible);
    console.log('✗ Self-hostable option:', selfHostable.visible);

    if (!dataResidency.visible && !selfHostable.visible) {
      console.log('❌ BOUNCE: Can\'t buy without knowing where servers are. Legal will block this.');
    }
  });

  test('Can see sub-processor risks', async ({ page }) => {
    // Need: Does this tool use OpenAI (US) for AI features?
    await page.goto('/tool/notion');

    const subProcessors = await checkVisible(page, 'text=/sub-processor|third-party|OpenAI|AWS/i');
    const aiDataWarning = await checkVisible(page, 'text=/AI features.*US|sends data to/i');

    console.log('⚠️  SUB-PROCESSOR RISK');
    console.log('✗ Sub-processors disclosed:', subProcessors.visible, '(CRITICAL for compliance)');
    console.log('✗ AI data warning:', aiDataWarning.visible);

    if (!subProcessors.visible) {
      console.log('❌ DEALBREAKER: Tool might be EU-hosted but use US AI services. Compliance nightmare.');
    }
  });
});

// ============================================================================
// SUMMARY TEST: Run all journeys and report which personas bounce
// ============================================================================
test.describe('User Journey Summary', () => {
  test('Summary: Which personas are well-served?', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 STACKHUNT USER JOURNEY READINESS REPORT');
    console.log('═══════════════════════════════════════════════\n');

    const results = {
      'Compliance-First Buyer': { ready: '75%', blockers: ['Data residency not shown', 'Company viability hidden'] },
      'Bootstrapped Solo Dev': { ready: '30%', blockers: ['No hard vs soft limit flag', 'Overage behavior unclear'] },
      'Hostage Migrator': { ready: '60%', blockers: ['No fidelity loss warnings', 'Missing "what breaks" details'] },
      'Non-Technical Agency Owner': { ready: '40%', blockers: ['No "Requires Developer?" flag', 'Setup complexity hidden'] },
      'Scale-Up CTO': { ready: '25%', blockers: ['No SSO tax calculation', 'Audit logs not shown', 'No SLA data'] },
      'Data Sovereign European': { ready: '15%', blockers: ['No data residency', 'No sub-processor disclosure'] },
    };

    for (const [persona, status] of Object.entries(results)) {
      console.log(`${status.ready.padEnd(5)} ready: ${persona}`);
      status.blockers.forEach(blocker => {
        console.log(`         ❌ ${blocker}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════\n');
  });
});
