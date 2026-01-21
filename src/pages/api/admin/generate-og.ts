/**
 * OG Image Generation API
 * POST /api/admin/generate-og
 *
 * Generates OG images for tools or comparison pages using Replicate Flux.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import {
  generateToolOGImage,
  generateComparisonOGImage,
  updateToolOGImage,
} from '@/lib/replicate';

export const prerender = false;

interface GenerateRequest {
  type: 'tool' | 'comparison';
  toolId?: string;
  toolSlug?: string;
  toolName?: string;
  toolA?: string;
  toolB?: string;
  style?: 'futuristic' | 'minimal' | 'gradient';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: GenerateRequest = await request.json();

    if (body.type === 'tool') {
      // Generate tool OG image
      if (!body.toolSlug || !body.toolName) {
        return new Response(
          JSON.stringify({ error: 'toolSlug and toolName are required for tool OG generation' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await generateToolOGImage(body.toolName, body.toolSlug, {
        style: body.style,
      });

      // Update database if toolId provided
      if (body.toolId) {
        await updateToolOGImage(body.toolId, result.url);
      }

      return new Response(
        JSON.stringify({
          success: true,
          url: result.url,
          storagePath: result.storagePath,
          prompt: result.prompt,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.type === 'comparison') {
      // Generate comparison OG image
      if (!body.toolA || !body.toolB) {
        return new Response(
          JSON.stringify({ error: 'toolA and toolB are required for comparison OG generation' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await generateComparisonOGImage(body.toolA, body.toolB);

      return new Response(
        JSON.stringify({
          success: true,
          url: result.url,
          storagePath: result.storagePath,
          prompt: result.prompt,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type. Use "tool" or "comparison"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OG generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET: Generate OG for a tool by slug (convenience endpoint)
export const GET: APIRoute = async ({ url }) => {
  const toolSlug = url.searchParams.get('slug');
  const style = url.searchParams.get('style') as 'futuristic' | 'minimal' | 'gradient' | null;

  if (!toolSlug) {
    return new Response(
      JSON.stringify({ error: 'slug parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch tool from database
    const admin = getAdminClient();
    const { data: tool, error } = await admin
      .from('tools')
      .select('id, name, slug')
      .eq('slug', toolSlug)
      .single();

    if (error || !tool) {
      return new Response(
        JSON.stringify({ error: 'Tool not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate image
    const result = await generateToolOGImage(tool.name, tool.slug, {
      style: style || undefined,
    });

    // Update database
    await updateToolOGImage(tool.id, result.url);

    return new Response(
      JSON.stringify({
        success: true,
        tool: tool.name,
        url: result.url,
        storagePath: result.storagePath,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OG generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
