/**
 * Affiliate Redirect Endpoint
 *
 * The Priority Router: Looks up the highest-priority active affiliate link
 * for a tool, logs the click, and 307 redirects the user.
 *
 * Route: /go/[tool-slug]
 *
 * Example: /go/notion → finds Notion → gets highest priority offer → 307 redirect
 */

import type { APIRoute } from 'astro';
import { supabase, getAdminClient } from '@/lib/supabase';
import { createHash } from 'crypto';

// Hash IP for privacy
function hashIP(ip: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export const GET: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response('Missing tool slug', { status: 400 });
  }

  try {
    // Step 1: Find the tool by slug
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id, name, website')
      .eq('slug', slug)
      .single();

    if (toolError || !tool) {
      // Tool not found - redirect to search or 404
      return new Response(null, {
        status: 302,
        headers: { Location: `/tools?q=${encodeURIComponent(slug)}` },
      });
    }

    // Step 2: Get highest priority active affiliate offer
    const { data: offer, error: _offerError } = await supabase
      .from('affiliate_offers')
      .select('id, url, cta_text, network, is_affiliate')
      .eq('tool_id', tool.id)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    // Fallback to tool's website if no offer exists
    const redirectUrl = offer?.url || tool.website;

    if (!redirectUrl) {
      return new Response('No redirect URL available for this tool', { status: 404 });
    }

    // Step 3: Log the click (non-blocking, use admin client)
    const adminClient = getAdminClient();
    if (adminClient && offer) {
      // Extract request info
      const referrer = request.headers.get('referer') || null;
      const userAgent = request.headers.get('user-agent') || null;
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ip = forwardedFor?.split(',')[0]?.trim() || null;
      const ipHash = hashIP(ip);

      // Get country from Vercel headers (if available)
      const countryCode = request.headers.get('x-vercel-ip-country') || null;

      // Parse source page from referrer
      let sourcePage: string | null = null;
      if (referrer) {
        try {
          const refUrl = new URL(referrer);
          sourcePage = refUrl.pathname;
        } catch {
          // Invalid referrer URL, ignore
        }
      }

      // Fire and forget - don't await
      adminClient
        .rpc('log_click', {
          p_offer_id: offer.id,
          p_tool_id: tool.id,
          p_referrer: referrer,
          p_user_agent: userAgent,
          p_ip_hash: ipHash,
          p_country_code: countryCode,
          p_source_page: sourcePage,
        })
        .then(() => {
          // Click logged successfully
        })
        .catch((err) => {
          console.error('Failed to log click:', err);
        });
    }

    // Step 4: 307 Temporary Redirect (preserves method, cacheable)
    return new Response(null, {
      status: 307,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'private, max-age=0',
        // Prevent search engines from indexing redirect URLs
        'X-Robots-Tag': 'noindex, nofollow',
        // Indicate this is an affiliate redirect (for transparency)
        'X-Redirect-Type': offer?.is_affiliate ? 'affiliate' : 'direct',
      },
    });
  } catch (error) {
    console.error('Redirect error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
