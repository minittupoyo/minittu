import { getCollection } from 'astro:content';

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export async function GET({ site }: { site?: URL }) {
  const base = site ?? new URL('https://blog.minittu.net');
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const tags = [...new Set(posts.flatMap((post) => post.data.tags))];
  const staticPaths = ['/', '/posts', '/tags', '/about'];

  const entries = [
    ...staticPaths.map((path) => ({ url: new URL(path, base).href })),
    ...tags.map((tag) => ({ url: new URL(`/tags/${encodeURIComponent(tag)}`, base).href })),
    ...posts.map((post) => ({
      url: new URL(`/posts/${post.id}`, base).href,
      lastmod: (post.data.updatedDate ?? post.data.date).toISOString(),
    })),
  ];

  const urls = entries.map(({ url, lastmod }) => `\n  <url>
    <loc>${escapeXml(url)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`).join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
