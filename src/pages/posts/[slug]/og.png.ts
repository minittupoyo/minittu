import { getCollection } from 'astro:content';
import { ImageResponse } from 'takumi-js/response';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

// フォントのキャッシュロード（タイムアウトとエラーフォールバック付き）
const fontCachePath = path.resolve('src/assets/fonts/NotoSansJP-Bold.otf');

async function getFontData() {
  if (fs.existsSync(fontCachePath)) {
    try {
      return fs.readFileSync(fontCachePath);
    } catch {
      return undefined;
    }
  }
  
  try {
    fs.mkdirSync(path.dirname(fontCachePath), { recursive: true });
    const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/SubsetOTF/JP/NotoSansJP-Bold.otf';
    
    // 5秒のタイムアウト管理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(fontUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(fontCachePath, buffer);
    return buffer;
  } catch (error) {
    console.warn('Failed to fetch Noto Sans JP font, falling back to default built-in fonts:', error.message);
    return undefined;
  }
}

export async function GET({ props }) {
  const { post } = props;
  const fontData = await getFontData();

  const displayTitle = post.data.title.length > 36 ? `${post.data.title.slice(0, 36)}...` : post.data.title;
  const displayDescription = post.data.description.length > 90 ? `${post.data.description.slice(0, 90)}...` : post.data.description;

  const fontOptions = [];
  if (fontData) {
    fontOptions.push({
      name: 'Noto Sans JP',
      data: fontData,
      weight: 700,
      style: 'normal',
    });
  }

  return new ImageResponse(
    React.createElement(
      'div',
      {
        tw: 'w-full h-full flex flex-col justify-between p-20 text-white font-sans',
        style: {
          fontFamily: fontData ? '"Noto Sans JP", sans-serif' : 'sans-serif',
          background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)',
        },
      },
      React.createElement(
        'div',
        { tw: 'flex items-center justify-between' },
        React.createElement(
          'span',
          { tw: 'text-3xl font-extrabold tracking-tight text-[#ff4d4d]' },
          'みにっつ'
        ),
        React.createElement(
          'span',
          { tw: 'text-xl text-stone-500 font-mono' },
          'blog.minittu.net'
        )
      ),
      React.createElement(
        'div',
        { tw: 'flex flex-col gap-6' },
        React.createElement(
          'div',
          { tw: 'flex gap-2' },
          (post.data.tags || []).slice(0, 3).map((tag: string) =>
            React.createElement(
              'span',
              {
                tw: 'px-3 py-1 text-sm bg-stone-800 text-stone-300 rounded-full border border-stone-700/50',
                key: tag,
              },
              `#${tag}`
            )
          )
        ),
        React.createElement(
          'h1',
          {
            tw: 'text-6xl font-extrabold leading-snug tracking-tight text-white',
          },
          displayTitle
        ),
        React.createElement(
          'p',
          {
            tw: 'text-2xl text-[#a8a29a] font-normal leading-relaxed',
          },
          displayDescription
        )
      ),
      React.createElement(
        'div',
        { tw: 'flex items-center justify-between text-lg text-stone-500 font-mono border-t border-stone-800 pt-6' },
        React.createElement(
          'span',
          null,
          'Rendered with Takumi (Rust)'
        ),
        React.createElement(
          'span',
          null,
          post.data.date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        )
      )
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontOptions,
    }
  );
}
