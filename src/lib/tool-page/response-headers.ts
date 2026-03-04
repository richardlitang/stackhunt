interface ApplyToolPageRobotsHeaderInput {
  response: { headers: Headers };
  robotsTag: string;
}

export function applyToolPageRobotsHeader(input: ApplyToolPageRobotsHeaderInput): void {
  input.response.headers.set('X-Robots-Tag', input.robotsTag);
}
