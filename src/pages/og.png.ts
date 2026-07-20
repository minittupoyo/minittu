import { ImageResponse } from 'takumi-js/response';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import stylesheet from '../styles/global.css?inline';

export async function GET() {
  const fontPath = path.resolve('src/assets/fonts/NotoSansJP-Bold.otf');
  const fontData = fs.existsSync(fontPath) ? fs.readFileSync(fontPath) : undefined;

  return new ImageResponse(
    React.createElement(
      'div',
      {
        className: 'w-full h-full flex flex-col justify-between p-20 text-stone-900 bg-stone-50 border-[16px] border-stone-200',
        style: { fontFamily: fontData ? '"Noto Sans JP", sans-serif' : 'sans-serif' },
      },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between border-b border-stone-200/80 pb-6' },
        React.createElement('span', { className: 'text-2xl font-extrabold tracking-tight' }, 'MINITTU'),
        React.createElement('span', { className: 'text-xl text-stone-400 font-mono' }, 'blog.minittu.net'),
      ),
      React.createElement(
        'div',
        { className: 'flex flex-col flex-1 justify-center gap-6' },
        React.createElement('h1', { className: 'text-7xl font-extrabold tracking-tight leading-tight' }, 'みにっつのブログ'),
        React.createElement('p', { className: 'text-2xl text-stone-500 leading-relaxed' }, '日記や開発のメモを置いている、超個人的備忘録。'),
      ),
      React.createElement(
        'div',
        { className: 'flex justify-end border-t border-stone-200/80 pt-6 text-base text-stone-400 font-mono' },
        'blog.minittu.net',
      ),
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontData ? [{ name: 'Noto Sans JP', data: fontData, weight: 700, style: 'normal' }] : [],
      stylesheets: [stylesheet],
    },
  );
}
