interface BuildToolPageVideoStateInput {
  videoId: string | null | undefined;
}

export function buildToolPageVideoState(input: BuildToolPageVideoStateInput): {
  hasVideo: boolean;
} {
  return {
    hasVideo: Boolean(input.videoId),
  };
}
