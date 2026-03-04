import { describe, expect, it } from 'vitest';
import { buildToolPageSpecsProps } from '@/lib/tool-page/specs-props';

describe('tool page specs props', () => {
  it('maps specs props for DynamicSpecs', () => {
    const result = buildToolPageSpecsProps({
      displayCategorySpecificData: { foo: 1 },
      vipSpecifics: { bar: 2 },
      toolName: 'Tool',
      categoryName: 'Category',
    });

    expect(result).toEqual({
      categorySpecificData: { foo: 1 },
      specifics: { bar: 2 },
      toolName: 'Tool',
      categoryName: 'Category',
    });
  });
});
