export function applyToolPageVersionBypassCacheHeaders(
  response: { headers: Headers },
  hasVersionBypassParam: boolean
): void {
  if (!hasVersionBypassParam) return;
  const noStore = 'no-store, max-age=0';
  response.headers.set('Cache-Control', noStore);
  response.headers.set('CDN-Cache-Control', noStore);
  response.headers.set('Vercel-CDN-Cache-Control', noStore);
}
