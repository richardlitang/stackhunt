/**
 * API: Record Signal
 * Captures structured user signals (not free-form reviews)
 * Uses record_signal() RPC for secure insertion
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { hashIdentifier, getClientIP } from '@/lib/rate-limit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const {
      itemId,
      signalKey,
      optionKey,
      valueBool,
      valueText,
      valueNum,
      fingerprintHash,
      ipHash: clientIpHash,
      userAgent,
      sourcePage,
    } = body;

    // Validate required fields
    if (!itemId || !signalKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash IP server-side for better security
    const ip = getClientIP(request, clientAddress);
    const ipHash = hashIdentifier(ip);

    // Check rate limit: Max 5 signals per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: recentCount } = await supabase
      .from('user_signals')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo);

    if (recentCount && recentCount >= 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already submitted this signal for this item (duplicate prevention)
    const { data: existingSignal } = await supabase
      .from('user_signals')
      .select('id')
      .eq('item_id', itemId)
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo)
      .limit(1)
      .maybeSingle();

    if (existingSignal) {
      // Allow different signals, but prevent same signal spam
      const { data: existingSignalForKey } = await supabase
        .from('user_signals')
        .select('id, signal_id')
        .eq('item_id', itemId)
        .eq('ip_hash', ipHash)
        .gte('created_at', oneHourAgo);

      // Get signal_id for the signalKey
      const { data: signalDef } = await supabase
        .from('signal_definitions')
        .select('id')
        .eq('key', signalKey)
        .maybeSingle();

      if (
        signalDef &&
        existingSignalForKey?.some((s: any) => s.signal_id === signalDef.id)
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You already submitted this signal recently',
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Call record_signal RPC (secure insert)
    const { data, error } = await supabase.rpc('record_signal', {
      p_item_id: itemId,
      p_signal_key: signalKey,
      p_option_key: optionKey || null,
      p_value_bool: valueBool !== undefined ? valueBool : null,
      p_value_text: valueText || null,
      p_value_num: valueNum || null,
      p_ip_hash: ipHash,
      p_fingerprint_hash: fingerprintHash || null,
      p_user_agent: userAgent || null,
      p_source_page: sourcePage || null,
    });

    if (error) {
      console.error('Failed to record signal:', error.code || error.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record signal' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return success from RPC
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Signal recording error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
