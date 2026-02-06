/**
 * Logo Service - Logo hotlinking strategy (Brandfetch TOS compliant)
 *
 * Extracts domain from website URL and stores it for hotlinking.
 * Frontend Logo component constructs CDN URLs dynamically:
 * - Brandfetch: https://cdn.brandfetch.io/{domain}?c={clientId}
 * - Fallback chain: Google Favicons → DuckDuckGo → Initials
 *
 * This approach complies with Brandfetch free tier TOS (hotlinking allowed, downloading prohibited).
 *
 * @module hunter/services/logo
 */

import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface LogoConfig {
  supabase: SupabaseClient<Database>;
}

export class LogoService {
  private supabase: SupabaseClient<Database>;

  constructor(config: LogoConfig) {
    this.supabase = config.supabase;
  }

  /**
   * Prepare logo for a tool using hotlinking strategy
   * Stores only the domain - frontend Logo component handles CDN URL construction
   *
   * This is LEGAL and TOS-compliant:
   * - Brandfetch allows hotlinking (downloading is prohibited)
   * - No Supabase Storage usage
   * - Always fresh logos (auto-updates if company changes branding)
   */
  async fetchAndUpload(
    toolName: string,
    websiteUrl?: string,
    onLog?: (message: string) => void
  ): Promise<{ path: string; url: string } | null> {
    const log = onLog || (() => {});
    log(`Preparing logo for: ${toolName}`);

    if (!websiteUrl) {
      log('No website URL - skipping logo');
      return null;
    }

    try {
      const domain = new URL(websiteUrl).hostname;

      // NEW STRATEGY: Save domain for hotlinking (complies with Brandfetch TOS)
      // Frontend will construct: https://cdn.brandfetch.io/{domain}?c={clientId}

      // Verify domain is accessible (quick HEAD request)
      try {
        await axios.head(websiteUrl, { timeout: 3000 });
        log(`Domain verified: ${domain}`);

        // Return domain as "path" for backward compatibility
        // Frontend Logo component will use this to construct Brandfetch URL
        return {
          path: `hotlink:${domain}`, // Special format to indicate hotlinking
          url: domain, // Store just the domain
        };
      } catch (verifyError) {
        log(`Domain verification failed: ${(verifyError as Error).message}`);
        return null;
      }
    } catch (urlError) {
      log(`Invalid website URL: ${(urlError as Error).message}`);
      return null;
    }
  }
}
