import { describe, expect, it } from 'vitest';
import { buildToolPageReviewArtifacts } from '@/lib/tool-page/review-artifacts';
import {
  buildToolPageReviewArtifactsState,
  buildToolPageReviewArtifactsStateFromRoute,
} from '@/lib/tool-page/review-artifacts-state';

describe('tool page review artifacts state', () => {
  it('matches evaluation and evidence link fields from review artifacts', () => {
    const input = {
      canonicalFacts: {
        tested_on: {
          environment: {
            os: 'macOS',
            browser: 'Chrome',
          },
          steps: ['Create workspace', 'Invite teammate'],
          findings: ['Fast setup', 'Smooth onboarding'],
          tested_at: '2026-03-05',
        },
      },
      reviewSources: [
        {
          title: 'Docs',
          url: 'https://example.com/docs',
          domain: 'example.com',
          basis: 'official_docs',
          quality: 'high',
          inclusionReason: 'official',
        },
      ],
      toolName: 'Acme',
    };

    const state = buildToolPageReviewArtifactsState(input);
    const previous = buildToolPageReviewArtifacts(input);

    expect(state.evaluationViewModel).toEqual(previous.evaluationViewModel);
    expect(state.evidenceLinksViewModel).toEqual(previous.evidenceLinksViewModel);
    expect(state.handsOnTestEnvironment).toEqual(
      previous.evaluationViewModel.handsOnTestEnvironment
    );
    expect(state.evidenceLinksAll).toEqual(previous.evidenceLinksViewModel.evidenceLinksAll);
    expect(state.officialEvidenceLinks).toEqual(
      previous.evidenceLinksViewModel.officialEvidenceLinks
    );
  });

  it('builds review artifact state directly from route-level fields', () => {
    const state = buildToolPageReviewArtifactsStateFromRoute({
      canonicalFacts: {
        tested_on: {
          environment: { os: 'macOS' },
          steps: ['Create workspace'],
          findings: ['Fast setup'],
          tested_at: '2026-03-05',
        },
      },
      reviewSources: [
        {
          title: 'Docs',
          url: 'https://example.com/docs',
          domain: 'example.com',
          basis: 'official_docs',
          quality: 'high',
          inclusionReason: 'official',
        },
      ],
      toolName: 'Acme',
    });

    expect(state.evaluationDepth).toBeTruthy();
    expect(state.evidenceLinksAll.length).toBeGreaterThanOrEqual(0);
  });
});
