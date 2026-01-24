/**
 * Notifications Module
 *
 * Exports notification utilities for alerts and webhooks.
 *
 * @module notifications
 */

export {
  sendDiscordAlert,
  alertApiError,
  alertQueueSummary,
  alertCritical,
  type DiscordWebhookPayload,
  type DiscordEmbed,
} from './discord';
