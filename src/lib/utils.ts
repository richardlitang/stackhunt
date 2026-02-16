import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get score color based on value (SDS v2 - dark mode compatible)
 */
export function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (score >= 85) {
    return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      label: 'Excellent',
    };
  }
  if (score >= 70) {
    return {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/30',
      label: 'Good',
    };
  }
  if (score >= 50) {
    return {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      label: 'Average',
    };
  }
  if (score >= 30) {
    return {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      label: 'Below Average',
    };
  }
  return {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    label: 'Poor',
  };
}

/**
 * Format pricing type for display
 */
export function formatPricingType(type: string): string {
  const labels: Record<string, string> = {
    free: 'Free',
    freemium: 'Freemium',
    paid: 'Paid',
    enterprise: 'Enterprise',
    open_source: 'Open Source',
  };
  return labels[type] || type;
}

/**
 * Get pricing badge color (SDS v2 - Emerald for money/business)
 */
export function getPricingColor(type: string): string {
  const colors: Record<string, string> = {
    free: 'bg-emerald-500/15 text-emerald-400',
    freemium: 'bg-emerald-500/15 text-emerald-400',
    paid: 'bg-emerald-500/15 text-emerald-400',
    enterprise: 'bg-zinc-800 text-zinc-400',
    open_source: 'bg-indigo-500/15 text-indigo-400',
  };
  return colors[type] || 'bg-zinc-800 text-zinc-400';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(path: string): string {
  const base = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.io';
  return `${base}${path}`;
}

/**
 * Simple markdown to HTML (for summaries)
 * For complex markdown, use a proper library
 */
export function simpleMarkdown(text: string): string {
  const sanitizeStructuredClaimMarkdown = (value: string): string =>
    value.replace(/\{[^{}\n]*"text"[^{}\n]*\}/g, (snippet) => {
      try {
        const parsed = JSON.parse(snippet) as Record<string, unknown>;
        if (typeof parsed.text !== 'string') return snippet;
        return parsed.text.trim();
      } catch {
        return snippet;
      }
    });

  return sanitizeStructuredClaimMarkdown(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
