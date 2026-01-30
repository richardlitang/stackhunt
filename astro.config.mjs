import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
