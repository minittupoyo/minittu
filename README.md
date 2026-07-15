# AGANA ブログ

過度な装飾を削ぎ落とし、読みやすさを最優先したミニマルな個人ブログです。
本番ビルド時は純粋な静的サイト（SSG）として出力され、開発時は **Keystatic** によるビジュアルエディタを使って直感的に記事を執筆できます。

---

## 🚀 開発の進め方と記事の執筆

### 1. 開発サーバーの起動
ローカル開発サーバーを起動します（Keystatic も同時に有効化されます）。

```sh
bun run dev
```

*   **ブログ閲覧**: `http://localhost:4321/`
*   **管理画面（Keystatic）**: `http://localhost:4321/keystatic`

### 2. Keystatic での記事執筆
ブラウザで `/keystatic` にアクセスすると、ビジュアルエディタが起動します。
*   新しい記事を作成すると、`src/content/blog/` ディレクトリに YAMLフロントマター付きの Markdown（MDX形式）ファイルが自動生成されます。
*   執筆した内容は、そのままローカルファイルとして保存されます。

---

## 📁 フォルダ構成

```text
/
├── src/
│   ├── content/
│   │   └── blog/           # 記事のMarkdownファイルが格納されます
│   ├── layouts/            # 共通レイアウト
│   ├── pages/              # 各ページのルーティング
│   └── styles/
│       └── global.css      # Tailwind CSSおよびグローバルスタイル
├── keystatic.config.ts     # Keystaticのスキーマ定義ファイル
├── astro.config.mjs        # Astroの設定ファイル
└── DESIGN.md               # ブログのデザインガイドライン
```

---

## 🧞 コマンド一覧

| コマンド | アクション |
| :--- | :--- |
| `bun install` | 依存パッケージのインストール |
| `bun run dev` | 開発サーバーの起動（ローカル執筆用） |
| `bun run build` | 本番用の静的HTMLビルド（`./dist/`に出力） |
| `bun run preview` | ビルドした静的ファイルのローカルプレビュー |

---

## 🔗 リンクカード

記事本文で URL だけの段落を書くと、Markdown ビルド時にリンクカードへ変換されます。
実装は `remark-link-card-plus` 相当の Sätteri プラグインとして [src/lib/satteri-link-card-plus.js](src/lib/satteri-link-card-plus.js) に置いています。

### 使い方

```md
https://example.com/articles/hello
```

上のように、1 行に URL だけを書いた段落がカード化されます。
通常のインラインリンクや、リスト内の URL はカード化されません。

```md
[通常のリンク](https://example.com)

- https://example.com
```

リンクカードは `open-graph-scraper` で対象ページの Open Graph / Twitter Card / `<title>` / favicon を取得して生成されます。
取得に失敗した場合もビルドは落とさず、ホスト名と favicon を使ったフォールバックのカードを生成します。

### 設定

Astro の Markdown processor に Sätteri プラグインとして登録します。
現在は OGP 画像と favicon を `public/remark-link-card-plus/` にキャッシュする設定です。

```js
// astro.config.mjs
import { satteri } from '@astrojs/markdown-satteri';
import { createSatteriLinkCardPlus } from './src/lib/satteri-link-card-plus.js';
import { satteriRemarkBreaks } from './src/lib/satteri-remark-breaks.js';

export default defineConfig({
  markdown: {
    processor: satteri({
      mdastPlugins: [
        satteriRemarkBreaks,
        createSatteriLinkCardPlus({ cache: true }),
      ],
    }),
  },
});
```

### オプション

| オプション | 既定値 | 説明 |
| :--- | :--- | :--- |
| `cache` | `false` | 画像と favicon を `public/remark-link-card-plus/` に保存し、`/remark-link-card-plus/...` として参照します。 |
| `shortenUrl` | `true` | カード下部の URL 表示をホスト名だけにします。`false` で完全な URL を表示します。 |
| `thumbnailPosition` | `'right'` | サムネイル位置。`'left'` または `'right'` を指定できます。 |
| `noThumbnail` | `false` | `true` の場合、OGP 画像を表示しません。 |
| `noFavicon` | `false` | `true` の場合、favicon を表示しません。 |
| `ignoreExtensions` | `[]` | 指定した拡張子の URL をカード化しません。例: `['.pdf', '.mp4']` |
| `timeoutMs` | `10000` | OGP 取得と画像キャッシュ時のタイムアウト時間です。 |
| `ogTransformer` | `undefined` | 取得した OGP 情報を描画前に加工できます。 |

`ogTransformer` は `{ title, description, faviconUrl, imageUrl }` と `URL` を受け取り、同じ形のオブジェクトを返します。

```js
createSatteriLinkCardPlus({
  ogTransformer: (og, url) => {
    if (url.hostname === 'github.com') {
      return { ...og, title: `GitHub: ${og.title}` };
    }

    return og;
  },
});
```

### スタイリング

生成される HTML は `remark-link-card-plus` 互換の class 名を使います。
見た目はグローバル CSS 側で調整してください。

```css
.remark-link-card-plus__container {}
.remark-link-card-plus__card {}
.remark-link-card-plus__main {}
.remark-link-card-plus__content {}
.remark-link-card-plus__title {}
.remark-link-card-plus__description {}
.remark-link-card-plus__meta {}
.remark-link-card-plus__favicon {}
.remark-link-card-plus__url {}
.remark-link-card-plus__thumbnail {}
.remark-link-card-plus__image {}
```

---

## 🎨 デザインガイドライン
このブログのデザイン仕様（配色、タイポグラフィ、余白のルール）については [DESIGN.md](file:///home/mimi/agana/DESIGN.md) を参照してください。
