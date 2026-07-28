import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import {
  paragraphAttr,
  paragraphSchema,
} from '@milkdown/kit/preset/commonmark';
import type { MarkdownNode } from '@milkdown/kit/transformer';
import { $remark } from '@milkdown/kit/utils';

export type PersistedTextAlignment = 'center' | 'right';

interface AlignedMarkdownNode extends MarkdownNode {
  textAlign?: PersistedTextAlignment;
}

const openingDivPattern = /^<div align="(center|right)">$/;
const closingDiv = '</div>';

const getExactHtmlValue = (node: MarkdownNode): string | undefined => {
  if (node.type === 'html' && typeof node.value === 'string') {
    return node.value;
  }

  if (
    node.type === 'paragraph' &&
    Array.isArray(node.children) &&
    node.children.length === 1
  ) {
    const child = node.children[0];

    if (child?.type === 'html' && typeof child.value === 'string') {
      return child.value;
    }
  }

  return undefined;
};

const parseOpeningDiv = (
  node: MarkdownNode,
): PersistedTextAlignment | undefined => {
  const match = getExactHtmlValue(node)?.match(openingDivPattern);
  const alignment = match?.[1];

  return alignment === 'center' || alignment === 'right'
    ? alignment
    : undefined;
};

const isClosingDiv = (node: MarkdownNode): boolean =>
  getExactHtmlValue(node) === closingDiv;

export const getTextAlignmentDivTags = (
  alignment: PersistedTextAlignment,
): Readonly<{ close: string; open: string }> => ({
  close: closingDiv,
  open: `<div align="${alignment}">`,
});

/**
 * Restores only the exact wrapper emitted by this editor:
 * opening div, one top-level paragraph, then closing div.
 *
 * Nested containers and more permissive HTML forms deliberately remain raw
 * Markdown so that unrelated user-authored HTML is not reinterpreted.
 */
export const restoreDivTextAlignment = (root: MarkdownNode): void => {
  if (root.type !== 'root' || !Array.isArray(root.children)) {
    return;
  }

  const children = root.children;

  for (let index = 0; index <= children.length - 3;) {
    const openingNode = children[index];
    const paragraph = children[index + 1];
    const closingNode = children[index + 2];
    const alignment = openingNode === undefined
      ? undefined
      : parseOpeningDiv(openingNode);

    if (
      alignment !== undefined &&
      paragraph?.type === 'paragraph' &&
      closingNode !== undefined &&
      isClosingDiv(closingNode)
    ) {
      (paragraph as AlignedMarkdownNode).textAlign = alignment;
      children.splice(index, 3, paragraph);
      index += 1;
      continue;
    }

    index += 1;
  }
};

const remarkDivTextAlignment = $remark(
  'remarkDivTextAlignment',
  () => () => (root) => {
    restoreDivTextAlignment(root as unknown as MarkdownNode);
  },
);

const getPersistedTextAlignment = (
  value: unknown,
): PersistedTextAlignment | null =>
  value === 'center' || value === 'right' ? value : null;

const paragraphTextAlignmentSchema = paragraphSchema.extendSchema(
  (previous) => (context) => {
    const schema = previous(context);

    return {
      ...schema,
      attrs: {
        ...schema.attrs,
        textAlign: {
          default: null,
          validate: 'string|null',
        },
      },
      toDOM: (node) => {
        const alignment = getPersistedTextAlignment(node.attrs.textAlign);
        const attributes = context.get(paragraphAttr.key)(node);

        return [
          'p',
          alignment === null
            ? attributes
            : { ...attributes, align: alignment },
          0,
        ];
      },
      parseMarkdown: {
        ...schema.parseMarkdown,
        runner: (state, node, type) => {
          const alignment = getPersistedTextAlignment(node.textAlign);

          state.openNode(type, { textAlign: alignment });

          if (Array.isArray(node.children)) {
            state.next(node.children);
          } else {
            state.addText(typeof node.value === 'string' ? node.value : '');
          }

          state.closeNode();
        },
      },
      toMarkdown: {
        ...schema.toMarkdown,
        runner: (state, node) => {
          const alignment = getPersistedTextAlignment(node.attrs.textAlign);

          if (alignment !== null) {
            const tags = getTextAlignmentDivTags(alignment);
            state.addNode('html', undefined, tags.open);
            schema.toMarkdown.runner(state, node);
            state.addNode('html', undefined, tags.close);
            return;
          }

          schema.toMarkdown.runner(state, node);
        },
      },
    };
  },
);

export const textAlignmentMarkdownPlugins: MilkdownPlugin[] = [
  remarkDivTextAlignment,
  paragraphTextAlignmentSchema,
].flat();
