import { describe, expect, it } from 'vitest';
import {
  normalizeCategorySlug,
  resolveCategoryFromContextTitle,
  resolveCategoryFromDossierPrimaryCategory,
  resolveCategoryFromPrimaryFunction,
  resolveDetectedCategory,
} from '@/lib/hunter/category-resolver';

describe('hunter category resolver', () => {
  it('normalizes known alias slugs to canonical slugs', () => {
    expect(normalizeCategorySlug('note-taking')).toBe('notetaking');
    expect(normalizeCategorySlug('team-chat')).toBe('communication');
  });

  it('maps dossier primary categories to canonical site categories', () => {
    expect(resolveCategoryFromDossierPrimaryCategory('saas_collaboration')).toBe('collaboration');
    expect(resolveCategoryFromDossierPrimaryCategory('marketing_email')).toBe('email-marketing');
    expect(resolveCategoryFromDossierPrimaryCategory('devtools')).toBe('developer-tools');
  });

  it('maps taxonomy primary function to canonical site categories', () => {
    expect(resolveCategoryFromPrimaryFunction('Project Management')).toBe('project-management');
    expect(resolveCategoryFromPrimaryFunction('CRM')).toBe('crm-sales');
  });

  it('maps context keywords to canonical categories', () => {
    expect(resolveCategoryFromContextTitle('Best CRM for startups')).toBe('crm-sales');
    expect(resolveCategoryFromContextTitle('Best no-code website builder')).toBe('no-code');
  });

  it('applies strict precedence: explicit > detected > dossier > taxonomy > context', () => {
    const resolved = resolveDetectedCategory({
      explicitCategorySlug: 'note-taking',
      detectedCategorySlug: 'crm-sales',
      dossierPrimaryCategory: 'marketing_email',
      taxonomyPrimaryFunction: 'Project Management',
      contextTitle: 'Best SEO tools',
    });
    expect(resolved).toBe('notetaking');
  });

  it('prefers detected category when explicit is absent', () => {
    const resolved = resolveDetectedCategory({
      detectedCategorySlug: 'sales-crm',
      dossierPrimaryCategory: 'marketing_email',
      taxonomyPrimaryFunction: 'Project Management',
      contextTitle: 'Best SEO tools',
    });
    expect(resolved).toBe('crm-sales');
  });

  it('falls through to dossier and taxonomy when no explicit detected slug exists', () => {
    expect(
      resolveDetectedCategory({
        dossierPrimaryCategory: 'video_conferencing',
        taxonomyPrimaryFunction: 'Project Management',
      })
    ).toBe('communication');

    expect(
      resolveDetectedCategory({
        taxonomyPrimaryFunction: 'Project Management',
      })
    ).toBe('project-management');
  });
});
