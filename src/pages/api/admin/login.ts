/**
 * API: Admin Login
 * POST /api/admin/login
 *
 * Validates password and creates a secure database-backed session.
 */

import type { APIRoute } from 'astro';
import {
  validatePassword,
  generateSessionToken,
  createSession,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from '@/lib/auth';
import { getClientIP } from '@/lib/rate-limit';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate password (constant-time comparison)
    if (!validatePassword(password)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure session token
    const token = generateSessionToken();

    // Get client info for session tracking
    const ipAddress = getClientIP(request, clientAddress);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Store session in database
    const sessionResult = await createSession(token, ipAddress, userAgent);

    if (!sessionResult.success) {
      console.error('Failed to create session:', sessionResult.error);
      return new Response(
        JSON.stringify({ success: false, error: 'Session creation failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Set session cookie
    cookies.set(COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
