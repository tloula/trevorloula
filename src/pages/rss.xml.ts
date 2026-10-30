import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { name, openGraph } from 'spectre:globals';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', (post) => post.data.draft !== true);

  return rss({
    title: name,
    description: openGraph.home.description,
    site: context.site!,
    items: posts
      .sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.createdAt,
        link: `/blog/${post.id}/`,
        categories: post.data.tags.map((tag) => tag.id),
      })),
  });
}
