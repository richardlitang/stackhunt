/**
 * Health Check API Endpoint - GET /api/health
 *
 * Returns system health status for monitoring.
 * Checks database connectivity and service status.
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latency_ms?: number;
      error?: string;
    };
    environment: {
      status: 'ok' | 'missing';
      missing?: string[];
    };
  };
}

export const GET: APIRoute = async () => {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0', // Could read from package.json
    checks: {
      database: { status: 'down' },
      environment: { status: 'ok' },
    },
  };

  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'SERPER_API_KEY',
  ];

  const getEnv = (key: string): string | undefined => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env as Record<string, string>)[key];
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  const missingEnvVars = requiredEnvVars.filter(key => !getEnv(key));

  if (missingEnvVars.length > 0) {
    health.checks.environment = {
      status: 'missing',
      missing: missingEnvVars,
    };
    health.status = 'degraded';
  }

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const { error } = await supabase
      .from('categories')
      .select('id')
      .limit(1)
      .single();

    const latency = Date.now() - dbStart;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      throw error;
    }

    health.checks.database = {
      status: 'up',
      latency_ms: latency,
    };
  } catch (err) {
    const error = err as Error;
    health.checks.database = {
      status: 'down',
      error: error.message,
    };
    health.status = 'unhealthy';
  }

  // Determine overall status
  if (health.checks.database.status === 'down') {
    health.status = 'unhealthy';
  } else if (health.checks.environment.status === 'missing') {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;

  return new Response(JSON.stringify(health, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};
