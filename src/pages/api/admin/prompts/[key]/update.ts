/**
 * API: Update Prompt
 * POST /api/admin/prompts/[key]/update
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ params, request }) => {
  const { key } = params;

  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const template = formData.get('template') as string;

    if (!template || template.trim().length === 0) {
      return new Response('Template cannot be empty', { status: 400 });
    }

    // Update prompt (trigger will auto-version)
    const { error } = await supabase
      .from('prompts')
      .update({ template: template.trim() })
      .eq('key', key);

    if (error) {
      console.error('Error updating prompt:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }

    // Redirect back to prompts list
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/prompts' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response('Internal error', { status: 500 });
  }
};
