import { buildToolPageLensRuntime } from '@/lib/tool-page/presentation/lens-runtime';
import { buildToolPageMetaRuntime } from '@/lib/tool-page/runtime/meta-runtime';
import { buildToolPageSchemas } from '@/lib/tool-page/runtime/schemas';
import { buildToolPageTrustRuntime } from '@/lib/tool-page/runtime/trust-runtime';
import { deriveToolPageUpdateHistoryLabels } from '@/lib/tool-page/presentation/update-labels';

export interface BuildToolPageRuntimeInput {
  lensInput: Parameters<typeof buildToolPageLensRuntime>[0];
  trustInput: Parameters<typeof buildToolPageTrustRuntime>[0];
  metaInput: Omit<Parameters<typeof buildToolPageMetaRuntime>[0], 'indexInput'> & {
    indexInput: Omit<
      Parameters<typeof buildToolPageMetaRuntime>[0]['indexInput'],
      'pendingVerificationCount'
    >;
  };
  schemasInput: Parameters<typeof buildToolPageSchemas>[0];
  updateHistoryLabelsInput: Parameters<typeof deriveToolPageUpdateHistoryLabels>[0];
}

export interface ToolPageRuntime {
  lensRuntime: ReturnType<typeof buildToolPageLensRuntime>;
  trustRuntime: ReturnType<typeof buildToolPageTrustRuntime>;
  metaRuntime: ReturnType<typeof buildToolPageMetaRuntime>;
  schemas: ReturnType<typeof buildToolPageSchemas>;
  updateHistoryLabels: ReturnType<typeof deriveToolPageUpdateHistoryLabels>;
}

export function buildToolPageRuntime(input: BuildToolPageRuntimeInput): ToolPageRuntime {
  const lensRuntime = buildToolPageLensRuntime(input.lensInput);
  const trustRuntime = buildToolPageTrustRuntime(input.trustInput);
  const metaRuntime = buildToolPageMetaRuntime({
    ...input.metaInput,
    indexInput: {
      ...input.metaInput.indexInput,
      pendingVerificationCount: trustRuntime.pendingVerificationCount,
    },
  });
  const schemas = buildToolPageSchemas(input.schemasInput);
  const updateHistoryLabels = deriveToolPageUpdateHistoryLabels(input.updateHistoryLabelsInput);

  return {
    lensRuntime,
    trustRuntime,
    metaRuntime,
    schemas,
    updateHistoryLabels,
  };
}
