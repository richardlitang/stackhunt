import {
  evaluateToolPageQaGate,
  type ToolPageQaGateInput,
  type ToolPageQaGateResult,
} from '@/lib/tool-page/policy/qa-gate';
import {
  evaluateToolPageIndexPolicy,
  type ToolPageIndexPolicyInput,
  type ToolPageIndexPolicyResult,
} from '@/lib/tool-page/policy/index-policy';

export interface BuildToolPageMetaRuntimeInput {
  qaInput: ToolPageQaGateInput;
  indexInput: Omit<ToolPageIndexPolicyInput, 'toolPageQaPass'>;
  baseMeta: {
    description: string;
    canonical: string;
  };
}

export interface ToolPageMetaRuntime {
  toolPageQaGate: ToolPageQaGateResult;
  indexPolicy: ToolPageIndexPolicyResult;
  meta: {
    description: string;
    canonical: string;
    noindex: boolean;
  };
}

export function buildToolPageMetaRuntime(
  input: BuildToolPageMetaRuntimeInput
): ToolPageMetaRuntime {
  const toolPageQaGate = evaluateToolPageQaGate(input.qaInput);
  const indexPolicy = evaluateToolPageIndexPolicy({
    ...input.indexInput,
    toolPageQaPass: toolPageQaGate.pass,
  });

  return {
    toolPageQaGate,
    indexPolicy,
    meta: {
      description: indexPolicy.description || input.baseMeta.description,
      canonical: indexPolicy.canonicalUrl || input.baseMeta.canonical,
      noindex: indexPolicy.shouldNoindex,
    },
  };
}
