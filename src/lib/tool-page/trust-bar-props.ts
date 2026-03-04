interface BuildToolPageTrustBarPropsInput {
  status: 'Source-backed' | 'Needs confirmation' | 'Needs recheck';
  pendingCount: number;
  evaluationDepth: 'Docs-only' | 'Light hands-on' | 'Deep hands-on';
  lastChecked: string;
  confidence: 'High' | 'Medium' | 'Low';
  sourcesCount: number;
}

export function buildToolPageTrustBarProps(input: BuildToolPageTrustBarPropsInput): {
  status: 'Source-backed' | 'Needs confirmation' | 'Needs recheck';
  pendingCount: number;
  evaluationDepth: 'Docs-only' | 'Light hands-on' | 'Deep hands-on';
  lastChecked: string;
  confidence: 'High' | 'Medium' | 'Low';
  sourcesCount: number;
} {
  return {
    status: input.status,
    pendingCount: input.pendingCount,
    evaluationDepth: input.evaluationDepth,
    lastChecked: input.lastChecked,
    confidence: input.confidence,
    sourcesCount: input.sourcesCount,
  };
}
