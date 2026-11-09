import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx';
import type { APIContext } from 'astro';
import { name, openGraph } from 'spectre:globals';

/** Point root-relative src/href attributes at the live site so the HTML works off-site. */
function absolutize(html: string, site: string): string {
  return html.replace(/(\s(?:src|href|poster)=")\/(?!\/)/g, `$1${site}/`);
}

/** Drop inline <script>/<style> (interactive widgets) that feed readers and cross-posts can't run. */
function stripScripts(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

export async function GET(context: APIContext) {
  const site = context.site!.toString().replace(/\/$/, '');
  const posts = await getCollection('posts', (post) => post.data.draft !== true);
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getMDXRenderer()]),
  });

  const items = await Promise.all(
    posts
      .sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime())
      .map(async (post) => {
        const { Content } = await render(post);
        const html = await container.renderToString(Content);
        const image = `${site}${post.data.image.src}`;
        return {
          title: post.data.title,
          description: post.data.description,
          pubDate: post.data.createdAt,
          link: `/blog/${post.id}/`,
          categories: post.data.tags.map((tag) => tag.id),
          // Full post HTML, so feed readers, dev.to's RSS import and the Hashnode
          // cross-post get the whole article (each links back here as canonical).
          content: `<p><img src="${image}" alt="${post.data.title}" /></p>` + absolutize(stripScripts(html), site),
          customData: `<media:content url="${image}" medium="image" />`,
        };
      }),
  );

  return rss({
    title: name,
    description: openGraph.home.description,
    site: context.site!,
    xmlns: { media: 'http://search.yahoo.com/mrss/' },
    items,
  });
}
