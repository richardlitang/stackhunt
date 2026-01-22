import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://stackhunt.io',
  output: 'server', // Server-side with prerendering for static pages
  adapter: vercel({
    imageService: true,
  }),
  integrations: [
    tailwind(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  vite: {
    ssr: {
      noExternal: ['lucide-react'],
    },
  },
});
