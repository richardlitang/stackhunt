/**
 * API: Get Signal Aggregates
 * Fetches aggregated signal data for an item
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  try {
    const itemId = url.searchParams.get('itemId');

    if (!itemId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing itemId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch aggregates with signal and option details
    const { data: aggregates, error } = await supabase
      .from('signal_aggregates')
      .select(
        `
        count_total,
        count_positive,
        count_negative,
        signal_definitions (
          key,
          label,
          category
        ),
        signal_options (
          key,
          label
        )
      `
      )
      .eq('item_id', itemId)
      .gt('count_total', 0) // Only return signals with data
      .order('count_total', { ascending: false });

    if (error) {
      console.error('Failed to fetch signal aggregates:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform the data for the frontend
    const transformed = aggregates?.map((agg: any) => ({
      signal_key: agg.signal_definitions?.key,
      signal_label: agg.signal_definitions?.label,
      signal_category: agg.signal_definitions?.category,
      option_key: agg.signal_options?.key,
      option_label: agg.signal_options?.label,
      count_total: agg.count_total,
      count_positive: agg.count_positive,
      count_negative: agg.count_negative,
    }));

    return new Response(JSON.stringify({ success: true, aggregates: transformed || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to fetch signal aggregates:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
