interface BuildToolPageLensPriorityLeadInput {
  activeReviewLens: string;
  activeLensLabel: string;
}

export function buildToolPageLensPriorityLead(input: BuildToolPageLensPriorityLeadInput): string {
  if (input.activeReviewLens === 'general') {
    return 'Start with these sections:';
  }
  return `For ${input.activeLensLabel} teams, start here:`;
}
