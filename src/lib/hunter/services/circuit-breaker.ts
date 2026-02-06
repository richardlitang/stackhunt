/**
 * Circuit Breaker Service
 *
 * Prevents cascading failures by stopping requests to failing services.
 * Implements the circuit breaker pattern with states: closed, open, half-open.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered
 *
 * @module hunter/services/circuit-breaker
 */

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes to close circuit from half-open
  resetTimeoutMs: number; // Time to wait before attempting recovery
}

export class CircuitOpenError extends Error {
  constructor(service: string) {
    super(`Circuit breaker is OPEN for ${service} - service is temporarily unavailable`);
    this.name = 'CircuitOpenError';
  }
}

type CircuitState = 'closed' | 'open' | 'half_open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private service: string;
  private config: CircuitBreakerConfig;

  constructor(service: string, config: CircuitBreakerConfig) {
    this.service = service;
    this.config = config;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        console.log(
          `[CircuitBreaker:${this.service}] Transitioning to HALF_OPEN (testing recovery)`
        );
        this.state = 'half_open';
        this.successCount = 0;
      } else {
        throw new CircuitOpenError(this.service);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        console.log(`[CircuitBreaker:${this.service}] CLOSED (service recovered)`);
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'closed') {
      // Decay failure count on successful execution to prevent false positives
      // This prevents scattered transient failures over long periods from accumulating
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();

    if (this.state === 'half_open') {
      // Failed during recovery test - reopen circuit
      console.log(`[CircuitBreaker:${this.service}] OPEN (recovery test failed)`);
      this.state = 'open';
      this.successCount = 0;
    } else if (this.state === 'closed') {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        console.log(
          `[CircuitBreaker:${this.service}] OPEN (failure threshold reached: ${this.failureCount})`
        );
        this.state = 'open';
      }
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log(`[CircuitBreaker:${this.service}] Manually reset to CLOSED`);
  }
}

// Pre-configured circuit breakers for different services
export const serperCircuit = new CircuitBreaker('serper', {
  failureThreshold: 5, // Open after 5 consecutive failures
  successThreshold: 2, // Close after 2 consecutive successes
  resetTimeoutMs: 30000, // Try recovery after 30 seconds
});

export const geminiCircuit = new CircuitBreaker('gemini', {
  failureThreshold: 3, // Open after 3 consecutive failures
  successThreshold: 2, // Close after 2 consecutive successes
  resetTimeoutMs: 60000, // Try recovery after 60 seconds
});
