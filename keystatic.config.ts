import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  collections: {
    blog: collection({
      label: 'ブログ記事',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'タイトル' } }),
        description: fields.text({ label: '説明', multiline: true }),
        date: fields.date({
          label: '日付',
          validation: { isRequired: true },
        }),
        heroImage: fields.image({
          label: 'カバー画像 (アイキャッチ)',
          directory: 'src/assets/images/blog',
          publicPath: '../../assets/images/blog/',
        }),
        tags: fields.array(fields.text({ label: 'タグ' }), {
          label: 'タグ',
          itemLabel: (props) => props.value,
        }),
        draft: fields.checkbox({ label: '下書き (公開しない場合はチェック)', defaultValue: false }),
        content: fields.mdx({
          label: '本文',
          extension: 'md',
          options: {
            bold: true,
            italic: true,
            strikethrough: true,
            code: true,
            heading: [1, 2, 3, 4, 5, 6],
            blockquote: true,
            orderedList: true,
            unorderedList: true,
            table: true,
            link: true,
            image: {
              directory: 'src/assets/images/blog',
              publicPath: '../../assets/images/blog/',
            },
            divider: true,
            codeBlock: true,
          },
        }),
      },
    }),
  },
});
