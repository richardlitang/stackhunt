/**
 * Slack Notification Service
 *
 * Sends webhook notifications to Slack for admin alerts.
 *
 * @module notifications/slack
 */

export interface SlackNotificationConfig {
  webhookUrl: string;
}

export interface CorrectionsSummary {
  pendingCount: number;
  oldestDays: number;
  uniqueTools: number;
  verificationRan: boolean;
  confirmedCount?: number;
  rejectedCount?: number;
  inconclusiveCount?: number;
  tokensUsed?: number;
}

/**
 * Send a Slack notification via webhook
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: {
    text: string;
    blocks?: Array<{
      type: string;
      text?: { type: string; text: string; emoji?: boolean };
      fields?: Array<{ type: string; text: string }>;
      elements?: Array<{ type: string; text: string }>;
    }>;
  }
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error('Slack notification error:', error);
    return false;
  }
}

/**
 * Send weekly corrections summary to Slack
 */
export async function sendCorrectionsSummary(
  webhookUrl: string,
  summary: CorrectionsSummary,
  adminUrl: string
): Promise<boolean> {
  const blocks: Array<{
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    fields?: Array<{ type: string; text: string }>;
    elements?: Array<{ type: string; text: string }>;
  }> = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: summary.verificationRan
          ? '🔍 Weekly Corrections Audit Complete'
          : '📋 Corrections Summary',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Pending Corrections:*\n${summary.pendingCount}`,
        },
        {
          type: 'mrkdwn',
          text: `*Unique Tools:*\n${summary.uniqueTools}`,
        },
        {
          type: 'mrkdwn',
          text: `*Oldest Correction:*\n${summary.oldestDays} days`,
        },
      ],
    },
  ];

  if (summary.verificationRan) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*✅ Confirmed:*\n${summary.confirmedCount || 0}`,
        },
        {
          type: 'mrkdwn',
          text: `*❌ Rejected:*\n${summary.rejectedCount || 0}`,
        },
        {
          type: 'mrkdwn',
          text: `*❓ Inconclusive:*\n${summary.inconclusiveCount || 0}`,
        },
        {
          type: 'mrkdwn',
          text: `*Tokens Used:*\n${summary.tokensUsed || 0}`,
        },
      ],
    });
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<${adminUrl}|View in Admin Dashboard →>`,
    },
  });

  const text = summary.verificationRan
    ? `Weekly corrections audit: ${summary.confirmedCount} confirmed, ${summary.rejectedCount} rejected, ${summary.inconclusiveCount} need review`
    : `You have ${summary.pendingCount} pending corrections across ${summary.uniqueTools} tools`;

  return sendSlackNotification(webhookUrl, { text, blocks });
}

/**
 * Send alert when thresholds are reached
 */
export async function sendThresholdAlert(
  webhookUrl: string,
  pendingCount: number,
  oldestDays: number,
  adminUrl: string
): Promise<boolean> {
  const reason =
    pendingCount >= 50
      ? `${pendingCount} pending corrections (threshold: 50)`
      : `Oldest correction is ${oldestDays} days old (threshold: 30)`;

  const message = {
    text: `⚠️ Corrections threshold reached: ${reason}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Corrections Threshold Reached',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason:* ${reason}\n\nAI verification will run automatically.`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${adminUrl}|Review Corrections →>`,
        },
      },
    ],
  };

  return sendSlackNotification(webhookUrl, message);
}
