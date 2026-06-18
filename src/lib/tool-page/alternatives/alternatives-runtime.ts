import {
  buildToolPageAlternativesState,
  type ToolPageAlternativesState,
} from '@/lib/tool-page/alternatives/alternatives-state';
import { buildToolPageAlternativesStateInput } from '@/lib/tool-page/alternatives/alternatives-input';

interface AlternativesRuntimeTool {
  slug: string;
  metadata?: unknown;
  item_category_links?: unknown;
}

interface BuildToolPageAlternativesRuntimeInput {
  tool: AlternativesRuntimeTool;
  orderedAlternatives: AlternativesRuntimeTool[];
}

export function buildToolPageAlternativesRuntime(
  input: BuildToolPageAlternativesRuntimeInput
): ToolPageAlternativesState {
  const stateInput = buildToolPageAlternativesStateInput(input);
  return buildToolPageAlternativesState(stateInput.primaryTool, stateInput.alternatives);
}

interface ToolPageAlternativesRuntimeItemLike {
  slug?: string | null;
  metadata?: unknown;
  item_category_links?: unknown;
}

export function buildToolPageAlternativesRuntimeFromItems(
  tool: ToolPageAlternativesRuntimeItemLike,
  orderedAlternatives: ToolPageAlternativesRuntimeItemLike[]
): ToolPageAlternativesState {
  return buildToolPageAlternativesRuntime({
    tool: {
      slug: tool.slug || '',
      metadata: tool.metadata,
      item_category_links: tool.item_category_links,
    },
    orderedAlternatives: orderedAlternatives.map((item) => ({
      slug: item.slug || '',
      metadata: item.metadata,
      item_category_links: item.item_category_links,
    })),
  });
}
