/**
 * API: Strategy Analyze
 * POST /api/admin/strategy/analyze
 *
 * Runs ROI analysis on pending content ideas.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const admin = getAdminClient();
    const formData = await request.formData();
    const limit = parseInt(formData.get('limit') as string) || 100;

    // Call the analyze function
    const { data, error } = await admin.rpc('analyze_content_ideas', {
      p_limit: limit,
    });

    if (error) {
      console.error('Analysis failed:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Analysis failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Redirect back to strategy page
    return redirect('/admin/strategy');
  } catch (err) {
    console.error('Analyze error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Analysis failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
