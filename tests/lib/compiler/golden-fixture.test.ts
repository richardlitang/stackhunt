import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffRankings } from '@/lib/compiler/diff-report';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../../fixtures/best_compare_golden');

type Fixture = {
  name: string;
  runtime: Array<{ id: string; score?: number }>;
  snapshot: Array<{ id: string; score?: number }>;
  expected: {
    runtimeCount: number;
    snapshotCount: number;
    overlapCount: number;
    topK: number;
    topKAgreementCount: number;
    missingInSnapshot: string[];
    missingInRuntime: string[];
  };
};

describe('compiler golden fixtures', () => {
  it('loads fixtures directory', () => {
    expect(fs.existsSync(fixturesDir)).toBe(true);
  });

  const files = fs
    .readdirSync(fixturesDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of files) {
    it(`matches expected ranking diff: ${file}`, () => {
      const fixturePath = path.join(fixturesDir, file);
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Fixture;
      const diff = diffRankings(fixture.runtime, fixture.snapshot, fixture.expected.topK);

      expect(diff.runtimeCount).toBe(fixture.expected.runtimeCount);
      expect(diff.snapshotCount).toBe(fixture.expected.snapshotCount);
      expect(diff.overlapCount).toBe(fixture.expected.overlapCount);
      expect(diff.topK).toBe(fixture.expected.topK);
      expect(diff.topKAgreementCount).toBe(fixture.expected.topKAgreementCount);
      expect(diff.missingInSnapshot).toEqual(fixture.expected.missingInSnapshot);
      expect(diff.missingInRuntime).toEqual(fixture.expected.missingInRuntime);
    });
  }
});

