/**
 * SEO & JSON-LD Schema Generators
 */

import type { Tool, Context, Review, AffiliateOffer } from '@/types/database';
import type { KnowledgeCard } from '@/lib/knowledge-card';
import { getCanonicalUrl } from './utils';

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

export function generateToolMeta(tool: Tool, _reviewCount?: number): MetaProps {
  const title = `${tool.name} Review: Pricing, Features, Pros & Cons (${new Date().getFullYear()}) | StackHunt`;
  const description = tool.short_description
    ? `${tool.short_description} See who ${tool.name} is best for, pricing details, constraints, and alternatives.`
    : `Evaluate ${tool.name} with pricing, feature coverage, operational constraints, and alternatives.`;

  return {
    title,
    description: description.slice(0, 160),
    canonical: getCanonicalUrl(`/tool/${tool.slug}`),
    ogImage: tool.logo_url || undefined,
    ogType: 'website',
  };
}

export function generateContextMeta(context: Context, _categoryName?: string): MetaProps {
  const title = `${context.title} (${new Date().getFullYear()}) | StackHunt`;
  const description =
    context.meta_description ||
    `Compare the ${context.title.toLowerCase()}. See ratings, pricing, pros & cons for ${context.tool_count}+ tools.`;

  return {
    title,
    description: description.slice(0, 160),
    canonical: getCanonicalUrl(`/best/${context.slug}`),
    ogType: 'website',
  };
}

export function generateCategoryMeta(name: string, slug: string, description?: string): MetaProps {
  return {
    title: `Best ${name} Software & Tools (${new Date().getFullYear()}) | StackHunt`,
    description:
      description ||
      `Discover the best ${name.toLowerCase()} tools. Compare features, pricing, and reviews to find the perfect solution.`,
    canonical: getCanonicalUrl(`/categories/${slug}`),
    ogType: 'website',
  };
}

// ============================================================================
// JSON-LD SCHEMA GENERATORS
// ============================================================================

/**
 * Organization schema (site-wide)
 * Updated for EEAT compliance - organization as publisher, not individual authors
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'StackHunt',
    url: getCanonicalUrl('/'),
    logo: getCanonicalUrl('/logo.png'),
    description:
      'AI-powered software research platform that helps teams discover, compare, and choose the right tools. We combine automated research with human verification to provide trustworthy software recommendations.',
    sameAs: ['https://www.linkedin.com/company/stackhunt-research'],
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
 * SoftwareApplication schema for tool pages (Enhanced for 2026)
 */
export function generateToolSchema(tool: Tool, offer?: AffiliateOffer, reviewCount?: number) {
  const metadata = tool.metadata as Record<string, unknown> | null;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    url: tool.website || getCanonicalUrl(`/tool/${tool.slug}`),
    description: tool.short_description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
  };

  // Add more specific sub-category if available
  if (tool.category?.name) {
    schema.applicationSubCategory = tool.category.name;
  }

  // Add software version if available in metadata
  const companyInfo = (metadata as any)?.company_info as { latest_version?: string; name?: string } | undefined;
  const version = companyInfo?.latest_version || (metadata as any)?.version;
  if (version && typeof version === 'string') {
    schema.softwareVersion = version;
  }

  // Add logo
  if (tool.logo_url) {
    schema.image = tool.logo_url;
  }

  // Add author/creator organization
  if ((metadata as any)?.company?.name || companyInfo?.name) {
    const companyName = (metadata as any)?.company?.name || companyInfo?.name;
    schema.author = {
      '@type': 'Organization',
      name: companyName,
    };
  }

  // Add offers with more detail
  if (offer) {
    schema.offers = {
      '@type': 'Offer',
      price: tool.pricing_type === 'free' ? '0' : undefined,
      priceCurrency: 'USD',
      url: offer.url,
      availability: 'https://schema.org/InStock',
      priceSpecification:
        tool.pricing_type === 'freemium'
          ? {
              '@type': 'UnitPriceSpecification',
              price: '0',
              priceCurrency: 'USD',
            }
          : undefined,
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

  // Add features if available
  const features = (metadata?.features as any)?.core || (metadata as any)?.key_features;
  if (Array.isArray(features) && features.length > 0) {
    schema.featureList = features
      .slice(0, 5)
      .map((f) => (typeof f === 'string' ? f : f?.name || f?.title))
      .filter(Boolean);
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
      url: getCanonicalUrl(`/tool/${item.tool.slug}`),
      item: {
        '@type': 'SoftwareApplication',
        name: item.tool.name,
        url: item.tool.website || getCanonicalUrl(`/tool/${item.tool.slug}`),
        description: item.tool.short_description,
        image: item.tool.logo_url,
      },
    })),
  };
}

/**
 * BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
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
 * VideoObject schema for tools with video content
 */
export function generateVideoSchema(tool: Tool, videoId: string, videoTitle: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: videoTitle || `${tool.name} Overview`,
    description: tool.short_description || `Video overview of ${tool.name}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    uploadDate: new Date().toISOString(),
    contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    author: {
      '@type': 'Organization',
      name: tool.name,
      url: tool.website || getCanonicalUrl(`/tool/${tool.slug}`),
    },
  };
}

/**
 * FAQPage schema (useful for SEO)
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
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
 * Includes both author and publisher for Review rich result eligibility
 */
export function generateReviewSchema(tool: Tool, review: Review, contextTitle: string) {
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
      ratingValue: ((review.score ?? 0) / 20).toFixed(1), // Convert 0-100 to 0-5
      bestRating: '5',
      worstRating: '1',
    },
    name: `${tool.name} Review for ${contextTitle}`,
    reviewBody: review.summary_markdown,
    author: {
      '@type': 'Organization',
      name: 'StackHunt Editorial Team',
      url: getCanonicalUrl('/methodology'),
    },
    publisher: {
      '@type': 'Organization',
      name: 'StackHunt',
      url: getCanonicalUrl('/'),
      logo: getCanonicalUrl('/logo.png'),
    },
    datePublished: review.created_at,
  };
}

/**
 * Generate Review schemas for context/list pages (top tools only to avoid bloat)
 */
export function generateContextReviewSchemas(
  contextTitle: string,
  reviews: Array<{ item: Tool; score: number; summary_markdown?: string; created_at?: string }>,
  limit = 3
) {
  return reviews.slice(0, limit).map((review) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: review.item.name,
      url: review.item.website || getCanonicalUrl(`/tool/${review.item.slug}`),
      image: review.item.logo_url,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: ((review.score ?? 0) / 20).toFixed(1), // Convert 0-100 to 0-5
      bestRating: '5',
      worstRating: '1',
    },
    name: `${review.item.name} for ${contextTitle}`,
    reviewBody:
      review.summary_markdown ||
      review.item.short_description ||
      `Analysis of ${review.item.name} for ${contextTitle}`,
    author: {
      '@type': 'Organization',
      name: 'StackHunt Editorial Team',
      url: getCanonicalUrl('/methodology'),
    },
    publisher: {
      '@type': 'Organization',
      name: 'StackHunt',
      url: getCanonicalUrl('/'),
      logo: getCanonicalUrl('/logo.png'),
    },
    datePublished: review.created_at || new Date().toISOString(),
  }));
}

/**
 * Generate FAQ schema for tool pages with common questions
 */
export function generateToolFAQSchema(tool: Tool, knowledgeCard?: KnowledgeCard | null) {
  const faqs = Array.isArray(knowledgeCard?.faqs) ? knowledgeCard?.faqs : [];
  if (faqs.length === 0) return null;

  return generateFAQSchema(
    faqs.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
    }))
  );
}

/**
 * Combine multiple schemas for a page
 */
export function combineSchemas(...schemas: Record<string, unknown>[]) {
  return schemas;
}
