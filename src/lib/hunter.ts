/**
 * Hunter - AI-powered tool research and review system
 *
 * LEGACY ENTRY POINT: This file maintains backward compatibility.
 * The actual implementation has been refactored into modular components
 * in the ./hunter/ directory.
 *
 * New structure:
 * - hunter/types.ts - Type definitions
 * - hunter/constants.ts - Fallback prompts
 * - hunter/utils.ts - Pure utility functions
 * - hunter/services/ - API wrappers (Serper, Gemini, Logo, Queue)
 * - hunter/phases/ - Pipeline phases (Research, Analysis, Persistence)
 * - hunter/orchestrator.ts - Main Hunter class
 * - hunter/index.ts - Public API
 *
 * All exports from this file are re-exported from the new modular structure.
 *
 * @module lib/hunter
 */

// Re-export everything from the new modular structure
export * from './hunter/index';
