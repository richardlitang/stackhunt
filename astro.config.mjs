import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

// Load environment variables
const env = loadEnv('', process.cwd(), '');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fetch dynamic pages for sitemap at build time
async function getDynamicPages() {
  const supabaseUrl = env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Sitemap] Missing Supabase credentials, skipping dynamic pages');
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const siteUrl = process.env.PUBLIC_SITE_URL || 'https://stackhunt.io';
  const pages = [];

  try {
    // Fetch all tools
    const { data: tools } = await supabase
      .from('items')
      .select('slug, type')
      .eq('type', 'tool');

    if (tools) {
      for (const tool of tools) {
        pages.push(`${siteUrl}/tool/${tool.slug}`);
      }
    }

    // Fetch all contexts (best lists)
    const { data: contexts } = await supabase
      .from('contexts')
      .select('slug');

    if (contexts) {
      for (const ctx of contexts) {
        pages.push(`${siteUrl}/best/${ctx.slug}`);
      }
    }

    // Fetch all categories
    const { data: categories } = await supabase
      .from('categories')
      .select('slug');

    if (categories) {
      for (const cat of categories) {
        pages.push(`${siteUrl}/categories/${cat.slug}`);
      }
    }

    console.log(`[Sitemap] Added ${pages.length} dynamic pages (${tools?.length || 0} tools, ${contexts?.length || 0} contexts, ${categories?.length || 0} categories)`);
  } catch (error) {
    console.error('[Sitemap] Error fetching dynamic pages:', error);
  }

  return pages;
}

const dynamicPages = await getDynamicPages();

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://stackhunt.io',
  output: 'server', // Server-side with prerendering for static pages
  adapter: vercel({
    imageService: true,
  }),
  integrations: [
    tailwind(),
    react(),
    icon({
      include: {
        lucide: ['*'], // Include all Lucide icons
      },
    }),
    sitemap({
      customPages: dynamicPages,
      filter: (page) => {
        // Exclude API routes and admin pages from sitemap
        return !page.includes('/api/') && !page.includes('/admin');
      },
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    ssr: {
      noExternal: ['lucide-react'],
    },
  },
});
