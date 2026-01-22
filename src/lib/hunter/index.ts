/**
 * Hunter - AI-powered tool research and review system
 *
 * Main entry point that re-exports the orchestrator and types.
 * This file maintains backward compatibility with the original hunter.ts API.
 *
 * @module hunter
 */

// Re-export main classes and factory
export { Hunter, createHunter } from './orchestrator';

// Re-export types for external consumers
export type {
  HunterConfig,
  HunterInput,
  HunterResult,
  ContextHuntInput,
  ContextHuntResult,
  HunterAnalysis,
  // Phase types for advanced usage
  HunterContext,
  HunterDependencies,
  ResearchOutput,
  AnalysisOutput,
  PersistenceOutput,
} from './types';

// Re-export utilities for external consumers
export { slugify, interpolateTemplate, buildFactSummary } from './utils';

// Re-export services for advanced usage
export {
  SerperService,
  GeminiService,
  LogoService,
  QueueService,
} from './services';

// Re-export phases for custom orchestration
export {
  executeResearchPhase,
  executeAnalysisPhase,
  executePersistencePhase,
} from './phases';
