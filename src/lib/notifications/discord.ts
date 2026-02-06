/**
 * Discord Webhook Notifications
 *
 * Sends alerts to Discord for critical failures.
 *
 * @module notifications/discord
 */

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
}

// Discord color constants
const COLORS = {
  error: 0xff0000, // Red
  warning: 0xffaa00, // Orange
  success: 0x00ff00, // Green
  info: 0x0099ff, // Blue
};

/**
 * Send a message to Discord webhook
 */
export async function sendDiscordAlert(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL provided' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'StackHunt Bot',
        ...payload,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Discord API error: ${response.status} ${text}` };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to send Discord alert: ${message}` };
  }
}

/**
 * Send an API error alert to Discord
 */
export async function alertApiError(
  webhookUrl: string,
  options: {
    service: 'serper' | 'gemini';
    errorType: string;
    message: string;
    isRetryable: boolean;
    context?: string;
  }
): Promise<void> {
  const embed: DiscordEmbed = {
    title: `API Error: ${options.service.toUpperCase()}`,
    description: options.message,
    color: options.isRetryable ? COLORS.warning : COLORS.error,
    fields: [
      { name: 'Error Type', value: options.errorType, inline: true },
      { name: 'Retryable', value: options.isRetryable ? 'Yes' : 'No', inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'StackHunt Automation' },
  };

  if (options.context) {
    embed.fields!.push({ name: 'Context', value: options.context, inline: false });
  }

  await sendDiscordAlert(webhookUrl, { embeds: [embed] });
}

/**
 * Send a queue processing summary to Discord
 */
export async function alertQueueSummary(
  webhookUrl: string,
  options: {
    processed: number;
    succeeded: number;
    failed: number;
    successes?: Array<{ tool: string; context?: string }>;
    processedTitles?: string[];
    errors: Array<{ tool: string; error: string }>;
  }
): Promise<void> {
  const hasFailures = options.failed > 0;

  const embed: DiscordEmbed = {
    title: hasFailures ? 'Queue Processing Completed with Errors' : 'Queue Processing Complete',
    color: hasFailures ? COLORS.warning : COLORS.success,
    fields: [
      { name: 'Processed', value: String(options.processed), inline: true },
      { name: 'Succeeded', value: String(options.succeeded), inline: true },
      { name: 'Failed', value: String(options.failed), inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'StackHunt Automation' },
  };

  // Show successful generations
  if (options.successes && options.successes.length > 0) {
    const successList = options.successes
      .slice(0, 10) // Show up to 10 successes
      .map((s) => {
        if (s.context) {
          return `• **${s.tool}** for _${s.context}_`;
        }
        return `• **${s.tool}**`;
      })
      .join('\n');

    embed.fields!.push({
      name: `Generated (${options.successes.length})`,
      value:
        successList +
        (options.successes.length > 10 ? `\n_...and ${options.successes.length - 10} more_` : ''),
      inline: false,
    });
  }

  if (options.errors.length > 0) {
    // Extract key error message (before stack trace, after error type)
    const extractKeyMessage = (error: string): string => {
      // Remove stack traces
      const firstLine = error.split('\n')[0];
      // Remove "Error: " prefix if present
      const cleaned = firstLine.replace(/^(Error|TypeError|ValidationError|ApiError):\s*/i, '');
      // Truncate to 80 chars max
      const truncated = cleaned.length > 80 ? cleaned.slice(0, 77) + '...' : cleaned;
      return truncated.length > 0
        ? truncated.charAt(0).toUpperCase() + truncated.slice(1)
        : truncated;
    };

    const errorList = options.errors
      .slice(0, 8) // Show more errors since they're compact
      .map((e) => `• **${e.tool}**: ${extractKeyMessage(e.error)}`)
      .join('\n');

    embed.fields!.push({
      name: `Failures (${options.errors.length})`,
      value:
        errorList +
        (options.errors.length > 8 ? `\n_...and ${options.errors.length - 8} more_` : ''),
      inline: false,
    });
  }

  if (options.processedTitles && options.processedTitles.length > 0) {
    const list = options.processedTitles
      .slice(0, 12)
      .map((t) => `• **${t}**`)
      .join('\n');

    embed.fields!.push({
      name: `Processed Items (${options.processedTitles.length})`,
      value:
        list +
        (options.processedTitles.length > 12
          ? `\n_...and ${options.processedTitles.length - 12} more_`
          : ''),
      inline: false,
    });
  }

  await sendDiscordAlert(webhookUrl, { embeds: [embed] });
}

/**
 * Send a critical alert (API key issues, quota exceeded)
 */
export async function alertCritical(
  webhookUrl: string,
  options: {
    title: string;
    message: string;
    service?: string;
    action?: string;
  }
): Promise<void> {
  const embed: DiscordEmbed = {
    title: `CRITICAL: ${options.title}`,
    description: options.message,
    color: COLORS.error,
    fields: [],
    timestamp: new Date().toISOString(),
    footer: { text: 'StackHunt Automation - IMMEDIATE ACTION REQUIRED' },
  };

  if (options.service) {
    embed.fields!.push({ name: 'Service', value: options.service, inline: true });
  }

  if (options.action) {
    embed.fields!.push({ name: 'Recommended Action', value: options.action, inline: false });
  }

  // Add @here mention for critical alerts
  await sendDiscordAlert(webhookUrl, {
    content: '@here Critical automation failure!',
    embeds: [embed],
  });
}
