import { defineConfig } from 'astro/config';

import expressiveCode from 'astro-expressive-code';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import spectre from './package/src';
import clarityIntegration from './clarity';
import { spectreDark } from './src/ec-theme';
import rehypeExternalLinks from 'rehype-external-links';
import { readdirSync, readFileSync } from 'node:fs';

// Last-modified date for each post, so the sitemap tells search engines what changed.
const postDates = new Map<string, Date>();
for (const file of readdirSync('./src/content/posts')) {
  const src = readFileSync(`./src/content/posts/${file}`, 'utf8');
  const date = (key: string) => src.match(new RegExp(`^${key}:\\s*["']?([\\d-]+)`, 'm'))?.[1];
  const value = date('updatedAt') ?? date('createdAt');
  if (value) postDates.set(`/blog/${file.replace(/\.mdx?$/, '')}/`, new Date(value));
}

// https://astro.build/config
export default defineConfig({
  site: 'https://trevorloula.com',
  output: 'static',
  integrations: [
    expressiveCode({
      themes: [spectreDark],
    }),
    mdx({
      rehypePlugins: [
        [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
      ],
    }),
    sitemap({
      serialize(item) {
        const lastmod = postDates.get(new URL(item.url).pathname);
        if (lastmod && !isNaN(lastmod.getTime())) item.lastmod = lastmod.toISOString();
        return item;
      },
    }),
    clarityIntegration({
      projectId: 'rnaf480oyj',
      enabled: true,
      scriptStage: 'head-inline',
      debug: false,
      async: true,
      defer: true,
    }),
    spectre({
      name: 'Trevor Loula',
      openGraph: {
        home: {
          title: 'Trevor Loula',
          description: 'Personal website & blog.'
        },
        blog: {
          title: 'Blog',
          description: 'Blog posts.'
        },
        projects: {
          title: 'Projects',
          description: 'Things I have built and am building.'
        }
      },
      // giscus: {
      //   repository: 'tloula/trevorloula',
      //   repositoryId: 'R_kgDONjm3ig',
      //   category: 'General',
      //   categoryId: 'DIC_kwDONjm3is4ClmBF',
      //   mapping: 'pathname',
      //   strict: true,
      //   reactionsEnabled: true,
      //   emitMetadata: false,
      //   lang: 'en',
      // }
    })
  ],
});