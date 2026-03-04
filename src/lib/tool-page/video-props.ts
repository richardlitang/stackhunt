interface BuildToolPageVideoPropsInput {
  toolName: string;
  videoTitle: string | null | undefined;
}

export function buildToolPageVideoProps(input: BuildToolPageVideoPropsInput): {
  title: string;
} {
  return {
    title: input.videoTitle || `${input.toolName} Overview`,
  };
}
