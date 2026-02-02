/**
 * Rate Limiter Service
 *
 * Controls concurrent API requests and enforces minimum delays between calls
 * to prevent hitting rate limits on external services (Serper, Gemini).
 *
 * @module hunter/services/rate-limiter
 */

export interface RateLimiterConfig {
  maxConcurrent: number;  // Maximum concurrent requests
  minDelayMs: number;     // Minimum delay between requests
}

export class RateLimiter {
  private running = 0;
  private queue: Array<() => void> = [];
  private lastRequestTime = 0;
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      // Enforce minimum delay between requests
      const elapsed = Date.now() - this.lastRequestTime;
      if (elapsed < this.config.minDelayMs) {
        await this.sleep(this.config.minDelayMs - elapsed);
      }
      this.lastRequestTime = Date.now();
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Execute multiple functions with rate limiting
   */
  async executeAll<T>(fns: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(fns.map(fn => this.execute(fn)));
  }

  /**
   * Acquire a slot for execution
   */
  private async acquire(): Promise<void> {
    if (this.running < this.config.maxConcurrent) {
      this.running++;
      return;
    }

    // Wait for a slot to become available
    await new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release a slot and notify waiting functions
   */
  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Pre-configured rate limiters for different services
export const serperRateLimiter = new RateLimiter({
  maxConcurrent: 4,  // 4 concurrent requests
  minDelayMs: 100,   // 100ms between requests
});

export const geminiRateLimiter = new RateLimiter({
  maxConcurrent: 3,  // 3 concurrent requests
  minDelayMs: 200,   // 200ms between requests
});
