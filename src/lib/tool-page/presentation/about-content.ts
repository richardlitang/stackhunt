interface BuildToolPageAboutContentInput {
  longDescription: string | null | undefined;
}

export function buildToolPageAboutContent(input: BuildToolPageAboutContentInput): {
  body: string;
} {
  return {
    body: input.longDescription || '',
  };
}
