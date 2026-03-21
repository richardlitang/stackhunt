import { describe, expect, it } from 'vitest';
import { resolveDiscoveredToolDomains } from '@/lib/hunter/services/scout';

describe('resolveDiscoveredToolDomains', () => {
  it('prefers domain resolved from matching search-result urls', () => {
    const resolved = resolveDiscoveredToolDomains(
      [
        { name: 'Acme CRM', domain: '', confidence: 'medium' },
        { name: 'BudgetFlow', domain: 'wrong.example', confidence: 'high' },
      ],
      [
        {
          title: 'Acme CRM pricing',
          snippet: 'Official plans for Acme CRM',
          link: 'https://acmecrm.com/pricing',
        },
        {
          title: 'BudgetFlow documentation',
          snippet: 'BudgetFlow setup guide',
          link: 'https://budgetflow.io/docs',
        },
      ]
    );

    expect(resolved).toEqual([
      { name: 'Acme CRM', domain: 'acmecrm.com', confidence: 'medium' },
      { name: 'BudgetFlow', domain: 'wrong.example', confidence: 'medium' },
    ]);
  });

  it('drops tools when domain cannot be resolved at all', () => {
    const resolved = resolveDiscoveredToolDomains(
      [{ name: 'Unknown Tool', domain: '', confidence: 'medium' }],
      [{ title: 'No mention here', snippet: 'irrelevant', link: 'https://example.com/post' }]
    );

    expect(resolved).toEqual([]);
  });
});
