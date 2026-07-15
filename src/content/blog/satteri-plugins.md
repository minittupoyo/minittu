---
title: "Astro v7のSatteri移行でMarkdownプラグインを作り直した"
description: "Astro v7でMarkdownプロセッサがSatteriになったので、remark-breaksとremark-link-card-plus相当の機能をCodeXに移植してもらった話。"
date: 2026-07-15T14:00:00.000Z
tags:
  - Satteri
  - CodeX
  - Astro
  - GPT-5.5
draft: false
---

## Astro v7に上げた

Astro v7にアップデートしました。

大きめの変更はいくつかあるんですが、私のブログで一番影響があったのはMarkdownまわりです。
Astro v7ではMarkdownプロセッサが`Satteri`になりました。

速くなるのは嬉しい。
嬉しいんですけど、今まで使っていたremark系のプラグインがそのままでは動かなくなりました。

このブログでは最低限ほしいMarkdown拡張が2つあります。

- 普通の改行を`<br>`として扱う
- URLだけの行をリンクカードにする

前者は`remark-breaks`、後者は`remark-link-card-plus`でやっていました。
つまり、ブログを書くうえで地味に大事な部分がまとめて使えなくなったわけです。

面倒ですね。

## CodeXに投げた

自分でSatteriのAPIを調べて書き直してもよかったんですが、こういう「既存プラグインの挙動を別のAPIに移す」作業はAIにかなり向いています。

なのでCodeXにお願いしました。
このブログ用に、Satteri互換のプラグインとして作り直してもらっています。

作ったファイルはこの2つです。

```text
src/lib/satteri-remark-breaks.js
src/lib/satteri-link-card-plus.js
```

設定は`astro.config.mjs`でこうなっています。

```js
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

これでSatteriのMarkdown変換に自作プラグインを差し込めます。

## remark-breaks相当のもの

まずは改行です。

Markdownは本来、普通にEnterを押しただけでは改行になりません。
行末にスペースを2つ入れるとか、明示的に`<br>`を書くとか、そういう作法があります。

でもブログを書くときにそれを毎回やるのはだるい。
私は普通に文章を書いたら、そのまま改行されてほしいです。

そこで`satteri-remark-breaks`では、テキストノード内の改行を見つけて`break`ノードに置き換えています。
やっていることはシンプルで、`remark-breaks`のSatteri版という感じ。

```js
import { defineMdastPlugin } from 'satteri';

export const satteriRemarkBreaks = defineMdastPlugin({
  name: 'satteri-remark-breaks',
  text(node, ctx) {
    // text nodeの改行をbreak nodeに置き換える
  },
});
```

実装量は少ないですが、これがないと記事を書くときの感覚がけっこう変わります。
文章系のブログではかなり重要。

## リンクカードも作り直した

次にリンクカードです。

このブログでは、URLを単独の行に置くとカードになるようにしています。

```md
[https://astro.build/](https://astro.build/)
```

こう書くと、ビルド時にOGPを取得してカード化します。

[https://astro.build/](https://astro.build/)

今回作った`satteri-link-card-plus`は、`remark-link-card-plus`と同じclass名でHTMLを出すようにしています。
そのため、以前書いたCSSをほぼそのまま使えます。

最初はHTMLをfetchしてmetaタグを自前で読む実装でした。
ただ、OGPはサイトごとに微妙に揺れるし、相対パスの画像やfaviconの処理もあります。

最終的には`open-graph-scraper`を使うようにしました。

```js
import ogs from 'open-graph-scraper';

const { result } = await ogs({
  url: url.href,
  timeout: 10,
});
```

取得しているのは主にこのあたりです。

- `ogTitle`
- `ogDescription`
- `ogImage`
- `twitterTitle`
- `twitterDescription`
- `twitterImage`
- `favicon`

OGPが取れた場合は、タイトル、説明、画像、faviconを使ったカードになります。
取れなかった場合も、ビルド自体は落とさずにフォールバックのカードを出します。

## `[]()`形式にも対応した

最初はURLそのものがリンクテキストになっているものだけカード化していました。

```md
[https://example.com](https://example.com)
```

でも、記事を書いているとこういう形も使いたくなります。

```md
[公式サイト](https://example.com)
```

この形式でも、単独の行ならカード化されるようにしました。
OGPが取得できた場合はOGPのタイトルを優先します。
取得できなかった場合は、リンクテキストを説明文として使います。

つまり、フォールバック時にも最低限「何のリンクか」は分かるようにしています。

## キャッシュで少しハマった

リンクカードはビルド時に外部サイトへアクセスします。
毎回全部取りに行くのは遅いし、相手サイトにもよくありません。

なので`cache: true`にして、取得した情報を`public/remark-link-card-plus/`以下に保存するようにしました。

保存しているものは2種類あります。

- OGPのメタデータ
- 画像とfavicon

画像とfaviconは`/remark-link-card-plus/...`として配信されます。
Gitに入れる必要はないので、`.gitignore`にも追加しました。

```text
public/remark-link-card-plus/
```

ここまでは普通なんですが、問題はAstroのcontent layerでした。

AstroはMarkdown本文のdigestが変わっていない場合、前回レンダリングしたHTMLを再利用します。
devでは取れているのに、buildするとフォールバックのカードになる、という現象が出ました。

最初は`open-graph-scraper`がbuild時だけ失敗しているのかと思いました。
でも調べると、build時は`node_modules/.astro/data-store.json`に保存された古いrendered HTMLが使われていました。

つまり、一度フォールバックで保存された記事は、本文を変えない限りそのまま残ることがありました。

対応として、build時だけプラグイン名に再レンダー用のキーを入れています。

```js
const buildRenderKey =
  process.env.ASTRO_COMMAND === 'build' ? Date.now().toString(36) : 'dev';
```

外部メタデータに依存する処理なので、build時には再評価されるほうが自然です。
これで`astro build`のたびにcontent storeが更新され、古いフォールバックカードを引きずらなくなりました。

## Satteri移行は思ったよりなんとかなった

最初にSatteriへ切り替わると聞いたときは、remarkの資産が使えなくなるのが少し不安でした。

ただ、今回くらいの用途なら思ったよりなんとかなります。
`defineMdastPlugin`でmdastノードを見て、必要なところだけ置き換える。
やること自体はかなり分かりやすいです。

もちろん、リンクカードみたいに外部通信やキャッシュが絡むと少し面倒です。
特にAstroのcontent layerのキャッシュは、知らないとかなりハマります。

でも、CodeXに作業を投げながら一緒に詰めていくと、こういう細かい問題も順番に潰せました。
AIに「プラグインを書いて」で終わりではなく、devとbuildの差、キャッシュの場所、fallback時の表示まで見ながら直していく感じです。

## おわり

Astro v7に上げて、Satteri向けにMarkdownプラグインを作り直しました。

結果として、今まで通りに記事を書けるようになりました。

- 普通の改行がそのまま反映される
- URLだけの行がリンクカードになる
- `[]()`形式の単独リンクもカード化される
- OGP取得に失敗してもフォールバックカードになる
- build時に古いfallbackを引きずらない

こういう地味な執筆体験の部分は、壊れるとかなり気になります。
無事に元の感覚へ戻せてよかったです。

移植したコードは`src/lib/`に置いてあります。
