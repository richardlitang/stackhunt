function isThinkingUnsupportedError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  return /thinking level is not supported for this model/i.test(message);
}

function isSchemaTooComplexError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  return /schema produces a constraint that has too many states/i.test(message);
}

export async function generateContentWithThinkingFallback(
  client: any,
  request: any
): Promise<any> {
  let currentRequest = request;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await client.models.generateContent(currentRequest);
    } catch (error) {
      const fallbackConfig = { ...(currentRequest.config ?? {}) };
      const dropped: string[] = [];

      if (fallbackConfig.thinkingConfig && isThinkingUnsupportedError(error)) {
        delete fallbackConfig.thinkingConfig;
        dropped.push('thinkingConfig');
      }

      if (fallbackConfig.responseSchema && isSchemaTooComplexError(error)) {
        delete fallbackConfig.responseSchema;
        dropped.push('responseSchema');
      }

      if (dropped.length === 0) {
        throw error;
      }

      currentRequest = {
        ...currentRequest,
        config: fallbackConfig,
      };
    }
  }

  throw new Error('Gemini compatibility fallback exhausted');
}
