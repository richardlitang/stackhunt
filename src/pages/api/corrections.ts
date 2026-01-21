/**
 * Corrections API - POST /api/corrections
 * Allows users to submit corrections for AI-generated content
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

// Simple hash function for IP (privacy-preserving)
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { tool_id, field_name, correction_text, reporter_email } = body;

    // Validation
    if (!tool_id || !correction_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (correction_text.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Please provide more detail' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (correction_text.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Correction too long (max 2000 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const admin = getAdminClient();

    // Rate limiting: Check if this IP has submitted recently
    const ipHash = hashIP(clientAddress || 'unknown');
    const { data: recentSubmissions } = await admin
      .from('corrections')
      .select('id')
      .eq('ip_hash', ipHash)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .limit(5);

    if (recentSubmissions && recentSubmissions.length >= 5) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert correction
    const { error } = await admin.from('corrections').insert({
      tool_id,
      field_name: field_name || 'other',
      correction_text: correction_text.trim(),
      reporter_email: reporter_email?.trim() || null,
      ip_hash: ipHash,
    });

    if (error) {
      console.error('Correction insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to submit correction' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Corrections API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
