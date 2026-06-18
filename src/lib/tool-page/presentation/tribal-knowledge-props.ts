interface BuildToolPageTribalKnowledgePropsInput {
  hasCommunity: boolean;
  userAdvocate: Record<string, unknown> | null;
  guardedHumanVerdict: string | null;
  vibe: string | null;
  originStory: string | null;
  idealFor: string[];
  guardedAvoidIf: string[];
  powerTip: string | null;
  delighters: string[];
  frustrations: string[];
}

export function buildToolPageTribalKnowledgeProps(input: BuildToolPageTribalKnowledgePropsInput): {
  shouldShow: boolean;
  userAdvocate:
    | {
        vibe: string | null;
        originStory: string | null;
        idealFor: string[];
        avoidIf: string[];
        powerTip: string | null;
        delighters: string[];
        frustrations: string[];
      }
    | undefined;
  humanVerdict: string | null;
} {
  return {
    shouldShow: input.hasCommunity && Boolean(input.userAdvocate || input.guardedHumanVerdict),
    userAdvocate: input.userAdvocate
      ? {
          vibe: input.vibe,
          originStory: input.originStory,
          idealFor: input.idealFor,
          avoidIf: input.guardedAvoidIf,
          powerTip: input.powerTip,
          delighters: input.delighters,
          frustrations: input.frustrations,
        }
      : undefined,
    humanVerdict: input.guardedHumanVerdict,
  };
}
