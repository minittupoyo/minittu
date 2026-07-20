import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

export const SITE_TITLE = 'みにっつのブログ';
export const SITE_DESCRIPTION = 'みにっつの超個人的備忘録。見ていてストレスのないシンプルな個人ブログ。';

export function getPublicPosts(posts: BlogPost[]) {
	return posts
		.filter(({ data }) => import.meta.env.DEV || !data.draft)
		.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function postMarkdownPath(post: BlogPost) {
	return `/posts/${post.id}.md`;
}

export function renderPostMarkdown(post: BlogPost, site: URL) {
	const canonicalUrl = new URL(`/posts/${post.id}`, site).href;
	const tags = post.data.tags.length > 0 ? post.data.tags.join(', ') : 'なし';
	const body = post.body?.trim() ?? '';

	return [
		`# ${post.data.title}`,
		'',
		`> ${post.data.description}`,
		'',
		`- 公開日: ${post.data.date.toISOString().slice(0, 10)}`,
		`- タグ: ${tags}`,
		`- 正規URL: ${canonicalUrl}`,
		'',
		body,
		'',
	].join('\n');
}
