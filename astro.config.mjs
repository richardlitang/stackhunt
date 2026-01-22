import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://stackhunt.com',
  output: 'server', // Server-side with prerendering for static pages
  adapter: vercel({
    webAnalytics: { enabled: true },
    imageService: true,
  }),
  integrations: [
    tailwind(),
    react(),
    sitemap({
      filter: (page) => {
        // Exclude API routes and admin pages from sitemap
        return !page.includes('/api/') && !page.includes('/admin');
      },
    }),
  ],
  vite: {
    ssr: {
      noExternal: ['lucide-react'],
    },
  },
});
