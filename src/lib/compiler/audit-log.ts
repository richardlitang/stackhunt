import { COOKIE_NAME, isLegacyToken, validateSession } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

type CookieStore = {
  get: (name: string) => { value?: string } | undefined;
};

type SnapshotAuditStatus = 'success' | 'error' | 'denied';

function sanitizeDetails(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getRequestIp(request: Request): string | null {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  return null;
}

async function resolveActor(cookies: CookieStore): Promise<string> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return 'unknown';
  if (isLegacyToken(token)) return 'legacy-token';
  const session = await validateSession(token);
  if (session.valid && session.sessionId) return `session:${session.sessionId}`;
  return 'session:invalid';
}

export async function logSnapshotAction(args: {
  action: string;
  status: SnapshotAuditStatus;
  request: Request;
  cookies: CookieStore;
  details?: unknown;
  error?: string | null;
}) {
  try {
    const admin = getAdminClient();
    const actor = await resolveActor(args.cookies);
    const detailsJson = sanitizeDetails(args.details);
    const userAgent = args.request.headers.get('user-agent') || null;
    const requestIp = getRequestIp(args.request);

    const { error } = await admin.from('snapshot_action_logs').insert({
      action: args.action,
      status: args.status,
      actor,
      details_json: detailsJson,
      error_text: args.error || null,
      request_ip: requestIp,
      user_agent: userAgent,
    });

    if (error) {
      console.warn(`[snapshot_audit] failed to insert log (${args.action}): ${error.message}`);
    }
  } catch (error) {
    console.warn('[snapshot_audit] unexpected logging failure:', error);
  }
}
