import { describe, expect, it } from 'vitest';
import { deriveToolPageLaneDecisionEvidenceSignals } from '@/lib/tool-page/lane-decision-signals';
import type { ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';

function makeLaneOutputs(): ToolPageLaneOutputs {
  return {
    subject_profile: {
      subject_type: 'product',
      subject_key: 'tool-x',
      display_name: 'Tool X',
      entity_scope: 'core',
      confidence: 'high',
    },
    fact_sheet: {
      official_facts: [{ text: 'Official fact' }],
      official_pricing_facts: [{ text: 'Pricing fact' }],
      official_limit_facts: [{ text: 'Limit fact' }],
    },
    user_signal_sheet: {
      user_signal_pros: [{ text: 'Users like workflow speed' }],
      user_signal_cons: [{ text: 'Users report setup friction' }],
    },
    editorial_decision: {
      summary: 'Summary',
      best_for: 'Best for teams that need policy controls.',
      not_for: 'Not for teams that only need lightweight tracking.',
      main_tradeoff: 'Tradeoff text',
      human_verdict: 'Verdict',
      main_risk: 'Main risk',
      upgrade_trigger: 'Upgrade trigger',
      implementation_friction_level: 'medium',
      fit_matrix: {
        solo: { fit: 'mixed', caveat: 'Admin burden', reason: 'Needs setup' },
        startup: { fit: 'strong', caveat: null, reason: 'Scales approvals' },
        mid_market: { fit: 'strong', caveat: null, reason: 'Works with controls' },
        enterprise: { fit: 'mixed', caveat: 'Needs SSO checks', reason: null },
      },
      test_before_buy: [
        {
          name: 'Daily workflow',
          why_it_matters: 'Shows operator fit',
          test: 'Run one full expense flow',
          pass_condition: 'No manual rework',
          common_failure: 'Policy mismatch',
        },
        {
          name: 'Admin setup',
          why_it_matters: 'Shows rollout friction',
          test: 'Configure roles and approvals',
          pass_condition: 'Roles map cleanly',
          common_failure: 'Role gaps',
        },
        {
          name: 'Export and edge case',
          why_it_matters: 'Checks data portability',
          test: 'Export all records',
          pass_condition: 'Export is complete',
          common_failure: 'Partial exports',
        },
      ],
      generation_mode: {
        main_risk: 'deterministic',
        upgrade_trigger: 'deterministic',
        implementation_friction: 'deterministic',
        fit_matrix: 'deterministic',
        test_before_buy: 'deterministic',
      },
    },
  };
}

describe('tool page lane decision signals', () => {
  it('returns true signals when lane outputs include required evidence fields', () => {
    const result = deriveToolPageLaneDecisionEvidenceSignals(makeLaneOutputs());
    expect(result).toEqual({
      hasSourceBackedMainRiskSignal: true,
      hasSourceBackedUpgradeTriggerSignal: true,
      hasSourceBackedImplementationFrictionSignal: true,
      hasSourceBackedFitMatrixSignal: true,
      hasSourceBackedTestBeforeBuySignal: true,
    });
  });

  it('returns false signals for missing or incomplete lane outputs', () => {
    const incomplete = makeLaneOutputs();
    incomplete.editorial_decision.main_risk = null;
    incomplete.editorial_decision.upgrade_trigger = null;
    incomplete.editorial_decision.implementation_friction_level = null;
    incomplete.editorial_decision.fit_matrix = null;
    incomplete.editorial_decision.test_before_buy = [];

    const result = deriveToolPageLaneDecisionEvidenceSignals(incomplete);
    expect(result).toEqual({
      hasSourceBackedMainRiskSignal: false,
      hasSourceBackedUpgradeTriggerSignal: false,
      hasSourceBackedImplementationFrictionSignal: false,
      hasSourceBackedFitMatrixSignal: false,
      hasSourceBackedTestBeforeBuySignal: false,
    });
  });
});
