import { defineConfig } from 'astro/config';

import expressiveCode from 'astro-expressive-code';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import spectre from './package/src';
import googleAnalytics from '@astrojs/google-analytics';

import node from '@astrojs/node';
import { spectreDark } from './src/ec-theme';

// https://astro.build/config
export default defineConfig({
  site: 'https://trevorloula.com',
  output: 'static',
  integrations: [
    expressiveCode({
      themes: [spectreDark],
    }),
    mdx(),
    sitemap(),
    googleAnalytics({
      measurementIds: ['G-MS7W4L99P0'],
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
          title: 'Projects'
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