/**
 * Logo Service - Logo fetching and uploading
 *
 * Handles fetching logos from various sources (Clearbit, Google, DuckDuckGo)
 * and uploading to Supabase storage.
 *
 * @module hunter/services/logo
 */

import axios, { type AxiosError } from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { slugify } from '../utils';

export interface LogoConfig {
  supabase: SupabaseClient<Database>;
}

export class LogoService {
  private supabase: SupabaseClient<Database>;

  constructor(config: LogoConfig) {
    this.supabase = config.supabase;
  }

  /**
   * Fetch and upload logo for a tool
   * Tries multiple sources in order: Clearbit, Google Favicons, DuckDuckGo
   */
  async fetchAndUpload(
    toolName: string,
    websiteUrl?: string,
    onLog?: (message: string) => void
  ): Promise<{ path: string; url: string } | null> {
    const log = onLog || (() => {});
    log(`Fetching logo for: ${toolName}`);

    if (!websiteUrl) {
      log('No website URL provided, skipping logo fetch');
      return null;
    }

    const logoSources = [
      `https://logo.clearbit.com/${new URL(websiteUrl).hostname}`,
      `https://www.google.com/s2/favicons?domain=${new URL(websiteUrl).hostname}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${new URL(websiteUrl).hostname}.ico`,
    ];

    for (const logoUrl of logoSources) {
      try {
        const response = await axios.get(logoUrl, {
          responseType: 'arraybuffer',
          timeout: 5000,
          validateStatus: (status) => status === 200,
        });

        const contentType = response.headers['content-type'] || 'image/png';
        const extension = contentType.includes('svg') ? 'svg' : contentType.includes('ico') ? 'ico' : 'png';
        const fileName = `${slugify(toolName)}.${extension}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await this.supabase.storage
          .from('assets')
          .upload(filePath, response.data, { contentType, upsert: true });

        if (uploadError) {
          log(`Logo upload failed: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = this.supabase.storage.from('assets').getPublicUrl(filePath);
        log(`Logo uploaded: ${urlData.publicUrl}`);
        return { path: filePath, url: urlData.publicUrl };
      } catch (error) {
        const axiosError = error as AxiosError;
        log(`Logo source failed: ${axiosError.message}`);
      }
    }

    log('All logo sources failed');
    return null;
  }
}
