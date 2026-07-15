---
title: "Satteri向けリンクカードプラグインを作った"
description: "Astro v7のSatteriで動く、remark-link-card-plus相当のリンクカードプラグインを作った話。OGP取得、キャッシュ、フォールバックまで。"
date: 2026-07-15T15:00:00.000Z
tags:
  - Satteri
  - Astro
  - 開発
draft: false
---

## リンクカードがほしい

ブログを書いていると、URLをそのまま貼りたい場面がよくあります。

ただ、本文中にURLがそのまま出ているだけだと少し味気ない。
タイトルや説明、サムネイル画像が出てくれると読みやすいです。

いわゆるリンクカードですね。

以前は`remark-link-card-plus`を使っていました。

[https://github.com/okaryo/remark-link-card-plus](https://github.com/okaryo/remark-link-card-plus)

これで困っていなかったんですが、Astro v7でMarkdownプロセッサが`Satteri`になったことで、そのままでは使えなくなりました。

なので、このブログ用にSatteri向けのリンクカードプラグインを作りました。(というより移植？)

## 作ったもの

作ったファイルはこれです。

```text
src/lib/satteri-link-card-plus.js
```

名前の通り、`remark-link-card-plus`相当のことをSatteriでやるためのプラグインです。

やっていることは大きく分けるとこんな感じ。

- 単独行のリンクを見つける
- URLのOGP情報を取得する
- 画像とfaviconをキャッシュする
- `remark-link-card-plus`互換のHTMLを出す
- 取得失敗時もフォールバックカードを出す

Astro側ではこう登録しています。

```js
import { satteri } from '@astrojs/markdown-satteri';
import { createSatteriLinkCardPlus } from './src/lib/satteri-link-card-plus.js';

export default defineConfig({
  markdown: {
    processor: satteri({
      mdastPlugins: [
        createSatteriLinkCardPlus({ cache: true }),
      ],
    }),
  },
});
```

この設定で、Markdownの変換時にリンクカード化されます。

## カード化する条件

全部のリンクをカードにすると本文がかなりうるさくなります。

なので、カード化するのは「段落がリンク1つだけ」の場合にしています。

例えばこれはカードになります。

```md
[https://astro.build/](https://astro.build/)
```

[https://astro.build/](https://astro.build/)

こういう書き方も、単独行ならカードになります。

```md
[Astro公式サイト](https://astro.build/)
```

一方で、文章中の普通のリンクはそのままです。
リスト内のリンクもカード化しません。

```md
Astroは[公式サイト](https://astro.build/)を見ると分かりやすいです。

- [https://astro.build/](https://astro.build/)
```

リンクカードは便利ですが、何でもカードになると邪魔ですからね。

## OGP取得はopen-graph-scraperに任せた

最初はHTMLをfetchして、`meta property="og:title"`などを自前で読んでいました。

ただ、OGP周りは意外と面倒です。

- Open GraphとTwitter Cardの両方を見る必要がある
- `og:image`が相対パスの場合がある
- faviconの場所がサイトごとに違う
- HTMLの書き方が微妙に揺れる

自前で頑張ることもできますが、ここは素直に`open-graph-scraper`を使うことにしました。

```js
import ogs from 'open-graph-scraper';

const { result } = await ogs({
  url: url.href,
  timeout: 10,
  fetchOptions: {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'satteri-link-card-plus',
    },
  },
});
```

取得した結果から、タイトル、説明、画像、faviconを組み立てています。

```js
const title = result.ogTitle ?? result.twitterTitle ?? url.hostname;
const description = result.ogDescription ?? result.twitterDescription ?? '';
```

画像は配列で返ってくることもあるので、最初の1件を使います。
相対URLだった場合は、元ページのURLを基準に絶対URLへ変換します。

このあたりを全部手書きし続けるより、ライブラリに寄せたほうが楽でした。

## キャッシュする

リンクカードはビルド時に外部サイトへアクセスします。
毎回すべてのURLを取り直すのは遅いです。

なので`cache: true`のときは、取得結果を`public/remark-link-card-plus/`に保存します。

保存しているものは2種類あります。

```text
public/remark-link-card-plus/metadata/*.json
public/remark-link-card-plus/<画像やfavicon>
```

metadataにはタイトルや説明、画像URLなどを保存します。
画像とfaviconはローカルに落として、`/remark-link-card-plus/...`として参照します。

これで2回目以降のビルドでは、取得済みのカードなら外部サイトにアクセスせずに済みます。

キャッシュファイルは生成物なので、Gitには入れません。

```text
public/remark-link-card-plus/
```

`.gitignore`に追加しています。

## build時の罠

ここで少しハマりました。

devではちゃんとOGPが取れているのに、buildするとフォールバックカードになることがありました。
キャッシュを消しても、なぜか古い表示が残る。

原因はAstroのcontent layerでした。

AstroはMarkdown本文のdigestが変わっていないと、前回レンダリングしたHTMLを再利用します。
buildでは`node_modules/.astro/data-store.json`に保存されたrendered HTMLが使われます。

つまり、一度フォールバックで保存されたカードが、そのまま残ってしまうことがありました。

リンクカードはMarkdown本文だけで決まるものではありません。
外部サイトのOGPや、プラグイン側のキャッシュ状態にも依存します。

なので、build時だけプラグイン名に再レンダー用のキーを含めるようにしました。

```js
const buildRenderKey =
  process.env.ASTRO_COMMAND === 'build' ? Date.now().toString(36) : 'dev';
```

これをプラグイン名の生成に含めることで、`astro build`のたびにcontent storeが更新されます。
少し力技ですが、外部メタデータを扱うプラグインとしてはこのほうが期待通りに動きます。

## フォールバックもカードにする

OGP取得は必ず成功するわけではありません。

ネットワークが落ちていることもあるし、サイト側に弾かれることもあります。
SpotifyやYouTubeみたいに、環境によって取れたり取れなかったりするものもあります。

そこで、取得に失敗してもリンクカード自体は出すようにしました。

フォールバック時はこういう情報を使います。

- タイトル: ホスト名
- 説明: `[]()`形式のリンクテキストがあればそれ
- favicon: Googleのfavicon API
- サムネイル: なし

例えばこういうMarkdownなら、

```md
[公式ドキュメント](https://example.com/docs)
```

OGPが取れなかった場合でも、説明に「公式ドキュメント」が入ります。

URLだけのカードより、少しだけ親切です。

## 出力するHTML

出力するHTMLのclass名は`remark-link-card-plus`互換にしています。

```html
<div class="remark-link-card-plus__container not-prose">
  <a class="remark-link-card-plus__card">
    <div class="remark-link-card-plus__main">
      <div class="remark-link-card-plus__content">
        <div class="remark-link-card-plus__title">...</div>
        <div class="remark-link-card-plus__description">...</div>
      </div>
    </div>
  </a>
</div>
```

既存のCSSを使い回したかったので、この形にしました。
プラグインを変えても見た目が変わらないのは大事です。

## おわり

Satteri向けにリンクカードプラグインを作りました。

最初は「remarkプラグインが使えないなら困るな」と思っていましたが、必要な挙動だけに絞れば意外となんとかなりました。

むしろ、自分のブログで必要な機能だけにできたので扱いやすいです。

- 単独行リンクだけカード化
- `[]()`形式にも対応
- `open-graph-scraper`でOGP取得
- metadataと画像をキャッシュ
- 失敗時もフォールバックカードを出す
- build時の古いrendered HTML問題にも対応

これでAstro v7でも、今まで通りリンクカード付きの記事を書けるようになりました。

コードは`src/lib/satteri-link-card-plus.js`に置いてあります。
