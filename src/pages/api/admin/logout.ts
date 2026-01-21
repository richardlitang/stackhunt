/**
 * API: Admin Logout
 * POST /api/admin/logout
 *
 * Revokes session from database and clears cookie.
 */

import type { APIRoute } from 'astro';
import { COOKIE_NAME, revokeSession } from '@/lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  // Get current session token
  const token = cookies.get(COOKIE_NAME)?.value;

  // Revoke session in database (if token exists)
  if (token) {
    await revokeSession(token);
  }

  // Delete session cookie
  cookies.delete(COOKIE_NAME, { path: '/' });

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
