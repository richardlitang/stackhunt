/**
 * Structured Logger Service for Hunter Pipeline
 *
 * Provides structured logging with phase timing, metrics, and JSON output for production.
 * Enables better observability and debugging of the hunter ETL pipeline.
 *
 * @module hunter/services/logger
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  phase?: string;
  duration_ms?: number;
  metrics?: Record<string, number>;
  error?: string;
  [key: string]: unknown;
}

export interface PhaseSummary {
  phase: string;
  duration_ms: number;
  metrics?: Record<string, number>;
}

export class HunterLogger {
  private logs: StructuredLogEntry[] = [];
  private phaseStartTime: number | null = null;
  private currentPhase: string | null = null;
  private phaseTimings: PhaseSummary[] = [];
  private huntStartTime: number;

  constructor() {
    this.huntStartTime = Date.now();
  }

  /**
   * Start tracking a phase
   */
  startPhase(phase: 'research' | 'analysis' | 'persistence'): void {
    this.currentPhase = phase;
    this.phaseStartTime = Date.now();
    this.info(`Starting ${phase} phase`);
  }

  /**
   * End tracking a phase and record metrics
   */
  endPhase(metrics?: Record<string, number>): void {
    if (!this.phaseStartTime || !this.currentPhase) {
      return;
    }

    const duration = Date.now() - this.phaseStartTime;
    this.phaseTimings.push({
      phase: this.currentPhase,
      duration_ms: duration,
      metrics,
    });

    this.info(`Completed ${this.currentPhase} phase`, {
      duration_ms: duration,
      metrics,
    });

    this.phaseStartTime = null;
    this.currentPhase = null;
  }

  /**
   * Log an info message
   */
  info(message: string, extra?: Partial<StructuredLogEntry>): void {
    this.log('info', message, extra);
  }

  /**
   * Log a warning message
   */
  warn(message: string, extra?: Partial<StructuredLogEntry>): void {
    this.log('warn', message, extra);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, extra?: Partial<StructuredLogEntry>): void {
    this.log('error', message, {
      ...extra,
      error: error?.message,
      stack: error?.stack,
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, extra?: Partial<StructuredLogEntry>): void {
    this.log('debug', message, extra);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, extra?: Partial<StructuredLogEntry>): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      phase: this.currentPhase || undefined,
      ...extra,
    };

    this.logs.push(entry);

    // Output based on environment
    if (process.env.NODE_ENV === 'production') {
      // JSON output for production (log aggregation)
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable output for development
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      const phaseTag = this.currentPhase ? `[${this.currentPhase}]` : '';
      console.log(`${prefix} ${phaseTag} ${message}`);
      if (extra && Object.keys(extra).length > 0) {
        console.log('   ', extra);
      }
    }
  }

  /**
   * Get all logs
   */
  getLogs(): StructuredLogEntry[] {
    return this.logs;
  }

  /**
   * Get summary of the hunt execution
   */
  getSummary(): {
    totalDurationMs: number;
    phaseTimings: PhaseSummary[];
    logCount: number;
    errorCount: number;
    warnCount: number;
  } {
    const totalDurationMs = Date.now() - this.huntStartTime;
    const errorCount = this.logs.filter((l) => l.level === 'error').length;
    const warnCount = this.logs.filter((l) => l.level === 'warn').length;

    return {
      totalDurationMs,
      phaseTimings: this.phaseTimings,
      logCount: this.logs.length,
      errorCount,
      warnCount,
    };
  }

  /**
   * Export logs as JSON string
   */
  toJSON(): string {
    return JSON.stringify(
      {
        summary: this.getSummary(),
        logs: this.logs,
      },
      null,
      2
    );
  }
}
