import { defineMdastPlugin } from 'satteri';

const lineEndingPattern = /\r\n?|\n/;

/**
 * Satteri-compatible copy of remark-breaks.
 *
 * Converts soft line endings inside mdast text nodes to hard break nodes,
 * matching remark-breaks without requiring the unified/remark pipeline.
 */
export const satteriRemarkBreaks = defineMdastPlugin({
  name: 'satteri-remark-breaks',
  text(node, ctx) {
    if (!lineEndingPattern.test(node.value)) return;

    const parent = ctx.parent(node);
    if (!parent || !('children' in parent)) return;

    const children = [];

    for (const child of parent.children) {
      if (child.type !== 'text' || !lineEndingPattern.test(child.value)) {
        children.push(child);
        continue;
      }

      const parts = child.value.split(lineEndingPattern);

      for (const [index, value] of parts.entries()) {
        if (index > 0) {
          children.push({ type: 'break' });
        }

        if (value) {
          children.push({ type: 'text', value });
        }
      }
    }

    ctx.setProperty(parent, 'children', children);
  },
});

export default satteriRemarkBreaks;
