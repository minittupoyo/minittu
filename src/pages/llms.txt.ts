import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
	getPublicPosts,
	postMarkdownPath,
	SITE_DESCRIPTION,
	SITE_TITLE,
} from '../lib/ai-content';

export const GET: APIRoute = async ({ site }) => {
	const baseUrl = site ?? new URL('https://blog.minittu.net');
	const posts = getPublicPosts(await getCollection('blog'));
	const lines = [
		`# ${SITE_TITLE}`,
		'',
		`> ${SITE_DESCRIPTION}`,
		'',
		'このファイルはAIやLLM向けのサイト案内です。各記事はMarkdown形式で取得できます。',
		'',
		'## 記事',
		'',
		...posts.map(
			(post) =>
				`- [${post.data.title}](${new URL(postMarkdownPath(post), baseUrl).href}): ${post.data.description}`,
		),
		'',
	];

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'X-Content-Type-Options': 'nosniff',
		},
	});
};
