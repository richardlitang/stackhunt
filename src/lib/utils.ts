import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (score >= 85) {
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      label: 'Excellent',
    };
  }
  if (score >= 70) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      label: 'Good',
    };
  }
  if (score >= 50) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      label: 'Average',
    };
  }
  if (score >= 30) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      label: 'Below Average',
    };
  }
  return {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
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
 * Get pricing badge color
 */
export function getPricingColor(type: string): string {
  const colors: Record<string, string> = {
    free: 'bg-green-100 text-green-700',
    freemium: 'bg-blue-100 text-blue-700',
    paid: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-slate-100 text-slate-700',
    open_source: 'bg-amber-100 text-amber-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
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
  const base = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.com';
  return `${base}${path}`;
}

/**
 * Simple markdown to HTML (for summaries)
 * For complex markdown, use a proper library
 */
export function simpleMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
