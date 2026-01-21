/**
 * SEO & JSON-LD Schema Generators
 */

import type { Tool, Context, Review, AffiliateOffer } from '@/types/database';
import { getCanonicalUrl, formatPricingType } from './utils';

// ============================================================================
// META TAG GENERATORS
// ============================================================================

export interface MetaProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
}

export function generateToolMeta(
  tool: Tool,
  reviewCount?: number
): MetaProps {
  const title = `${tool.name} Review & Alternatives 2025 | StackHunt`;
  const description = tool.short_description
    ? `${tool.short_description} Compare ${tool.name} with alternatives, see pricing, pros & cons.`
    : `Discover ${tool.name} alternatives, read reviews, compare features and pricing. Find the best ${tool.name} replacement for your needs.`;

  return {
    title,
    description: description.slice(0, 160),
    canonical: getCanonicalUrl(`/tools/${tool.slug}`),
    ogImage: tool.logo_url || undefined,
    ogType: 'website',
  };
}

export function generateContextMeta(
  context: Context,
  categoryName?: string
): MetaProps {
  const title = `${context.title} (${new Date().getFullYear()}) | StackHunt`;
  const description = context.meta_description
    || `Compare the ${context.title.toLowerCase()}. See ratings, pricing, pros & cons for ${context.tool_count}+ tools.`;

  return {
    title,
    description: description.slice(0, 160),
    canonical: getCanonicalUrl(`/best/${context.slug}`),
    ogType: 'website',
  };
}

export function generateCategoryMeta(
  name: string,
  slug: string,
  description?: string
): MetaProps {
  return {
    title: `Best ${name} Software & Tools (${new Date().getFullYear()}) | StackHunt`,
    description: description
      || `Discover the best ${name.toLowerCase()} tools. Compare features, pricing, and reviews to find the perfect solution.`,
    canonical: getCanonicalUrl(`/categories/${slug}`),
    ogType: 'website',
  };
}

// ============================================================================
// JSON-LD SCHEMA GENERATORS
// ============================================================================

/**
 * Organization schema (site-wide)
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'StackHunt',
    url: getCanonicalUrl('/'),
    logo: getCanonicalUrl('/logo.png'),
    sameAs: [
      'https://twitter.com/stackhunt',
      'https://github.com/stackhunt',
    ],
  };
}

/**
 * WebSite schema with search action
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'StackHunt',
    url: getCanonicalUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: getCanonicalUrl('/search?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * SoftwareApplication schema for tool pages
 */
export function generateToolSchema(
  tool: Tool,
  offer?: AffiliateOffer,
  reviewCount?: number
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    url: tool.website || getCanonicalUrl(`/tools/${tool.slug}`),
    description: tool.short_description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
  };

  // Add logo
  if (tool.logo_url) {
    schema.image = tool.logo_url;
  }

  // Add offers
  if (offer) {
    schema.offers = {
      '@type': 'Offer',
      price: tool.pricing_type === 'free' ? '0' : undefined,
      priceCurrency: 'USD',
      url: offer.url,
      availability: 'https://schema.org/InStock',
    };
  }

  // Add aggregate rating
  if (tool.avg_score > 0 && (reviewCount || tool.review_count) > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (tool.avg_score / 20).toFixed(1), // Convert 0-100 to 0-5
      bestRating: '5',
      worstRating: '1',
      ratingCount: reviewCount || tool.review_count,
    };
  }

  return schema;
}

/**
 * ItemList schema for context/list pages
 */
export function generateListSchema(
  context: Context,
  tools: Array<{ tool: Tool; score: number; position: number }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: context.title,
    description: context.meta_description || `List of ${context.title.toLowerCase()}`,
    url: getCanonicalUrl(`/best/${context.slug}`),
    numberOfItems: tools.length,
    itemListElement: tools.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.tool.name,
      url: getCanonicalUrl(`/tools/${item.tool.slug}`),
      item: {
        '@type': 'SoftwareApplication',
        name: item.tool.name,
        url: item.tool.website || getCanonicalUrl(`/tools/${item.tool.slug}`),
        description: item.tool.short_description,
        image: item.tool.logo_url,
      },
    })),
  };
}

/**
 * BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.url),
    })),
  };
}

/**
 * FAQPage schema (useful for SEO)
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Review schema for individual tool reviews
 */
export function generateReviewSchema(
  tool: Tool,
  review: Review,
  contextTitle: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: tool.name,
      url: tool.website,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: (review.score / 20).toFixed(1), // Convert 0-100 to 0-5
      bestRating: '5',
      worstRating: '1',
    },
    name: `${tool.name} Review for ${contextTitle}`,
    reviewBody: review.summary_markdown,
    author: {
      '@type': 'Organization',
      name: 'StackHunt',
    },
    publisher: {
      '@type': 'Organization',
      name: 'StackHunt',
    },
  };
}

/**
 * Combine multiple schemas for a page
 */
export function combineSchemas(...schemas: Record<string, unknown>[]) {
  return schemas;
}
