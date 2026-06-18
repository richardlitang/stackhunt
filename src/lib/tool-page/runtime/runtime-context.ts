import { buildToolPageRuntime } from '@/lib/tool-page/runtime/runtime';
import {
  buildToolPageRuntimeInput,
  type BuildToolPageRuntimeInputParams,
} from '@/lib/tool-page/runtime/runtime-input';
import {
  buildToolPageRuntimeInputParams,
  type BuildToolPageRuntimeParamsInput,
} from '@/lib/tool-page/runtime/runtime-params';

export function buildToolPageRuntimeContext(input: BuildToolPageRuntimeContextInput): {
  runtime: ReturnType<typeof buildToolPageRuntime>;
} {
  if (!input.runtimeInputParams && !input.runtimeParamsInput) {
    throw new Error('Either runtimeInputParams or runtimeParamsInput is required');
  }
  const runtimeInputParams = input.runtimeInputParams
    ? input.runtimeInputParams
    : buildToolPageRuntimeInputParams(input.runtimeParamsInput as BuildToolPageRuntimeParamsInput);
  const runtimeInput = buildToolPageRuntimeInput(runtimeInputParams);
  const runtime = buildToolPageRuntime(runtimeInput);
  return { runtime };
}

interface BuildToolPageRuntimeContextInput {
  runtimeInputParams?: BuildToolPageRuntimeInputParams;
  runtimeParamsInput?: BuildToolPageRuntimeParamsInput;
}
