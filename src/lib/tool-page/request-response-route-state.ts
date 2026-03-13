import { applyToolPageVersionBypassCacheHeaders } from '@/lib/tool-page/request-cache';
import { deriveToolPageRequestState } from '@/lib/tool-page/request-state';
import { applyToolPageRobotsHeader } from '@/lib/tool-page/response-headers';

interface BuildToolPageRequestRouteStateInput {
  searchParams: URLSearchParams;
  response: Response;
}

interface ApplyToolPageResponseRouteStateInput {
  response: Response;
  robotsTag: string;
}

export function buildToolPageRequestRouteState(
  input: BuildToolPageRequestRouteStateInput
): ReturnType<typeof deriveToolPageRequestState> {
  const requestState = deriveToolPageRequestState(input.searchParams);
  applyToolPageVersionBypassCacheHeaders(input.response, requestState.hasVersionBypassParam);
  return requestState;
}

export function applyToolPageResponseRouteState(input: ApplyToolPageResponseRouteStateInput): void {
  applyToolPageRobotsHeader({
    response: input.response,
    robotsTag: input.robotsTag,
  });
}
