import { getCollection } from 'astro:content';
import { ImageResponse } from 'takumi-js/response';
import { loadDefaultJapaneseParser } from 'budoux';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import stylesheet from '../../../styles/global.css?inline';

const parser = loadDefaultJapaneseParser();

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.DEV ? true : !data.draft;
  });
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

  const displayTitle = post.data.title;
  const displayDescription = post.data.description;

  // BudouXで日本語の改行位置の候補を抽出
  const titleChunks = parser.parse(displayTitle);
  const descriptionChunks = parser.parse(displayDescription);

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
        className: 'w-full h-full flex flex-col justify-between p-20 text-stone-900 bg-stone-50 border-[16px] border-stone-200',
        style: {
          fontFamily: fontData ? '"Noto Sans JP", sans-serif' : 'sans-serif',
        },
      },
      // ヘッダー部
      React.createElement(
        'div',
        { className: 'flex items-center justify-between border-b border-stone-200/80 pb-6' },
        React.createElement(
          'span',
          { className: 'text-2xl font-extrabold tracking-tight text-stone-900' },
          'みにっつ'
        ),
        React.createElement(
          'span',
          { className: 'text-xl text-stone-400 font-mono' },
          'blog.minittu.net'
        )
      ),
      // メインコンテンツ部
      React.createElement(
        'div',
        { className: 'flex flex-col gap-5 flex-1 justify-center py-6' },
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          (post.data.tags || []).slice(0, 3).map((tag: string) =>
            React.createElement(
              'span',
              {
                className: 'px-2.5 py-0.5 text-xs font-semibold bg-stone-200/60 text-stone-600 rounded border border-stone-300/30',
                key: tag,
              },
              `#${tag}`
            )
          )
        ),
        // タイトル: line-clamp-2で2行制限し、wbrでBudouXの改行位置を保障
        React.createElement(
          'h1',
          {
            className: 'text-5xl font-extrabold leading-snug tracking-tight text-stone-900 line-clamp-2',
          },
          titleChunks.flatMap((chunk, i) => [
            chunk,
            React.createElement('wbr', { key: `t-wbr-${i}` })
          ])
        ),
        // 説明文: line-clamp-3で3行制限し、同様にwbrを挿入
        React.createElement(
          'p',
          {
            className: 'text-xl text-stone-500 font-normal leading-relaxed line-clamp-3',
          },
          descriptionChunks.flatMap((chunk, i) => [
            chunk,
            React.createElement('wbr', { key: `d-wbr-${i}` })
          ])
        )
      ),
      // フッター部
      React.createElement(
        'div',
        { className: 'flex items-center justify-end text-base text-stone-400 font-mono border-t border-stone-200/80 pt-6' },
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
      stylesheets: [stylesheet],
    }
  );
}
