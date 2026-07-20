import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { getPublicPosts, renderPostMarkdown } from '../../lib/ai-content';

export const getStaticPaths = (async () => {
	const posts = getPublicPosts(await getCollection('blog'));

	return posts.map((post) => ({
		params: { slug: post.id },
		props: { post },
	}));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
	const post = props.post as CollectionEntry<'blog'>;

	return new Response(renderPostMarkdown(post, site ?? new URL('https://blog.minittu.net')), {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'X-Content-Type-Options': 'nosniff',
		},
	});
};
