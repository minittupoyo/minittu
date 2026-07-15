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
        tw: 'w-full h-full flex flex-col justify-between p-20 text-stone-900',
        style: {
          fontFamily: fontData ? '"Noto Sans JP", sans-serif' : 'sans-serif',
          backgroundColor: '#f5f5f4', // DESIGN.md: bg-stone-50 (暖かみのある非常に淡いグレー)
          border: '16px solid #e7e5e4', // DESIGN.md: border-stone-200 相当の額縁太枠
        },
      },
      // ヘッダー部
      React.createElement(
        'div',
        { tw: 'flex items-center justify-between border-b border-stone-200/80 pb-6' },
        React.createElement(
          'span',
          { tw: 'text-2xl font-extrabold tracking-tight text-stone-900' },
          'みにっつ'
        ),
        React.createElement(
          'span',
          { tw: 'text-xl text-stone-400 font-mono' },
          'blog.minittu.net'
        )
      ),
      // メインコンテンツ部 (縦方向中央寄せ)
      React.createElement(
        'div',
        { tw: 'flex flex-col gap-5 flex-1 justify-center py-6' },
        React.createElement(
          'div',
          { tw: 'flex gap-2' },
          (post.data.tags || []).slice(0, 3).map((tag: string) =>
            React.createElement(
              'span',
              {
                tw: 'px-2.5 py-0.5 text-xs font-semibold bg-stone-200/60 text-stone-600 rounded border border-stone-300/30',
                key: tag,
              },
              `#${tag}`
            )
          )
        ),
        React.createElement(
          'h1',
          {
            tw: 'text-5xl font-extrabold leading-snug tracking-tight text-stone-900',
          },
          displayTitle
        ),
        React.createElement(
          'p',
          {
            tw: 'text-xl text-stone-500 font-normal leading-relaxed',
          },
          displayDescription
        )
      ),
      // フッター部
      React.createElement(
        'div',
        { tw: 'flex items-center justify-between text-base text-stone-400 font-mono border-t border-stone-200/80 pt-6' },
        React.createElement(
          'span',
          null,
          'Rendered with Takumi'
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
