/**
 * Admin API: Add to Queue
 * POST /api/admin/queue/add
 *
 * Supports both form data and JSON requests.
 * Uses Zod validation for input sanitization.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { QueueAddRequestSchema, validationErrorResponse } from '@/lib/validation';
import { z } from 'zod';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  try {
    let rawData: Record<string, unknown>;

    if (isJson) {
      rawData = await request.json();
    } else {
      const formData = await request.formData();
      rawData = {
        tool_name: formData.get('tool_name'),
        context_title: formData.get('context_title') || null,
        priority: formData.get('priority') ? parseInt(formData.get('priority') as string) : 50,
      };
    }

    // Validate with Zod
    const result = QueueAddRequestSchema.safeParse(rawData);

    if (!result.success) {
      const errorMessage = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');

      if (isJson) {
        return validationErrorResponse(errorMessage);
      }
      return new Response(errorMessage, { status: 400 });
    }

    const { tool_name, context_title, priority } = result.data;

    const admin = getAdminClient();

    // V5: Ensure tool is classified before queuing (so Hunter gets Research Dossier)
    const { ensureClassification } = await import('@/lib/hunter/services/keyword-classifier');
    await ensureClassification(tool_name, admin, {
      onLog: console.log,
      contextTitle: context_title || undefined,
    });

    const { error } = await admin.from('hunt_queue').insert({
      tool_name,
      context_title,
      priority,
      source: 'admin',
    });

    if (error) {
      if (error.code === '23505') {
        // Duplicate
        if (isJson) {
          return new Response(JSON.stringify({ success: false, error: 'Already in queue' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(null, {
          status: 302,
          headers: { Location: '/admin/queue?error=duplicate' },
        });
      }

      if (error.code === 'P0001' || error.message?.includes('Queue depth limit')) {
        // Backpressure activated - queue is full
        if (isJson) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Queue is full - backpressure activated',
            hint: 'Please wait for queue to drain and retry',
          }), {
            status: 429,  // Too Many Requests
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '300',  // Suggest retry after 5 minutes
            },
          });
        }
        return new Response(null, {
          status: 302,
          headers: { Location: '/admin/queue?error=queue_full' },
        });
      }

      console.error('Queue add error:', error);

      if (isJson) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(`Failed: ${error.message}`, { status: 500 });
    }

    if (isJson) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/queue?added=true' },
    });
  } catch (error) {
    console.error('Admin queue add error:', error);

    if (error instanceof SyntaxError) {
      if (isJson) {
        return validationErrorResponse('Invalid JSON body');
      }
    }

    if (isJson) {
      return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Internal error', { status: 500 });
  }
};
