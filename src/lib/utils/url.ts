/**
 * URL Sanitization Utilities
 *
 * Validates and normalizes URLs from AI extraction.
 * Handles common issues like missing protocols, invalid formats.
 */

/**
 * Sanitize and validate a URL string.
 *
 * @param url - Raw URL string (may be missing protocol, invalid, etc.)
 * @returns Normalized URL string or null if invalid
 *
 * @example
 * sanitizeUrl('example.com') // 'https://example.com'
 * sanitizeUrl('https://example.com') // 'https://example.com'
 * sanitizeUrl('not a url') // null
 * sanitizeUrl(null) // null
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  let cleanUrl = url.trim();
  if (!cleanUrl) return null;

  // Add protocol if missing
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  try {
    const parsed = new URL(cleanUrl);
    // Return normalized URL (handles trailing slashes, encoding, etc.)
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extract domain from a URL.
 *
 * @param url - Full URL string
 * @returns Domain without protocol (e.g., 'example.com') or null if invalid
 */
export function extractDomain(url: string | null | undefined): string | null {
  const sanitized = sanitizeUrl(url);
  if (!sanitized) return null;

  try {
    const parsed = new URL(sanitized);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Remove common tracking params from URL for dedupe and comparison.
 */
export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((_, key) => {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
        parsed.searchParams.delete(key);
      }
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Check if a URL is from a specific domain.
 *
 * @param url - URL to check
 * @param domain - Domain to match (e.g., 'example.com')
 * @returns true if URL is from the specified domain
 */
export function isFromDomain(url: string | null | undefined, domain: string): boolean {
  const urlDomain = extractDomain(url);
  if (!urlDomain) return false;

  // Handle both 'example.com' and 'www.example.com'
  return urlDomain === domain || urlDomain === `www.${domain}` || urlDomain.endsWith(`.${domain}`);
}
