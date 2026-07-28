import type {
  MarkdownNode,
  Root as MarkdownRoot,
} from '@milkdown/kit/transformer';
import { remark } from 'remark';
import { describe, expect, it } from 'vitest';

import {
  getTextAlignmentDivTags,
  restoreDivTextAlignment,
  type PersistedTextAlignment,
} from './textAlignmentMarkdown';

interface AlignedMarkdownNode extends MarkdownNode {
  textAlign?: PersistedTextAlignment;
}

const parseMarkdown = (markdown: string): MarkdownNode =>
  remark().parse(markdown) as MarkdownNode;

const stringifyMarkdown = (tree: MarkdownNode): string =>
  remark().stringify(tree as unknown as MarkdownRoot);

const getChildren = (node: MarkdownNode): MarkdownNode[] =>
  Array.isArray(node.children) ? node.children : [];

const createHtmlNode = (value: string): MarkdownNode => ({
  type: 'html',
  value,
});

const createMilkdownHtmlParagraph = (value: string): MarkdownNode => ({
  children: [createHtmlNode(value)],
  type: 'paragraph',
});

describe('text alignment Markdown contract', () => {
  it.each<PersistedTextAlignment>(['center', 'right'])(
    'restores an exact %s wrapper around one paragraph',
    (alignment) => {
      const tree = parseMarkdown([
        `<div align="${alignment}">`,
        '',
        '**굵은 글씨**와 [링크](https://example.com)',
        '',
        '</div>',
        '',
      ].join('\n'));

      restoreDivTextAlignment(tree);

      const children = getChildren(tree);
      const paragraph = children[0] as AlignedMarkdownNode | undefined;

      expect(children).toHaveLength(1);
      expect(paragraph?.type).toBe('paragraph');
      expect(paragraph?.textAlign).toBe(alignment);
      expect(getChildren(paragraph as MarkdownNode).map((node) => node.type))
        .toEqual(['strong', 'text', 'link']);
    },
  );

  it('restores the same wrapper after Milkdown normalizes block HTML', () => {
    const tree = {
      children: [
        createMilkdownHtmlParagraph('<div align="center">'),
        {
          children: [{ alt: 'preview', type: 'image', url: './image.png' }],
          type: 'paragraph',
        },
        createMilkdownHtmlParagraph('</div>'),
      ],
      type: 'root',
    } as MarkdownNode;

    restoreDivTextAlignment(tree);

    const children = getChildren(tree);
    const paragraph = children[0] as AlignedMarkdownNode | undefined;

    expect(children).toHaveLength(1);
    expect(paragraph?.textAlign).toBe('center');
    expect(getChildren(paragraph as MarkdownNode)[0]?.type).toBe('image');
  });

  it('restores consecutive wrappers as independent paragraphs', () => {
    const tree = parseMarkdown([
      '<div align="center">',
      '',
      '첫 문단',
      '',
      '</div>',
      '',
      '<div align="right">',
      '',
      '둘째 문단',
      '',
      '</div>',
      '',
    ].join('\n'));

    restoreDivTextAlignment(tree);

    const children = getChildren(tree) as AlignedMarkdownNode[];

    expect(children).toHaveLength(2);
    expect(children.map((node) => node.textAlign)).toEqual([
      'center',
      'right',
    ]);
  });

  it.each([
    ['formatted text', '**굵은 글씨**와 [링크](https://example.com)'],
    ['an image', '![미리보기](./image.png)'],
  ])('round-trips %s through the strict right wrapper', (_name, body) => {
    const paragraph = getChildren(parseMarkdown(`${body}\n`))[0];
    const tags = getTextAlignmentDivTags('right');
    const alignedTree = {
      children: [
        createHtmlNode(tags.open),
        paragraph,
        createHtmlNode(tags.close),
      ],
      type: 'root',
    } as MarkdownNode;

    const serialized = stringifyMarkdown(alignedTree);

    expect(serialized).toBe([
      '<div align="right">',
      '',
      body,
      '',
      '</div>',
      '',
    ].join('\n'));

    const reparsed = parseMarkdown(serialized);
    restoreDivTextAlignment(reparsed);

    const restored = getChildren(reparsed)[0] as
      AlignedMarkdownNode | undefined;

    expect(getChildren(reparsed)).toHaveLength(1);
    expect(restored?.textAlign).toBe('right');
    expect(stringifyMarkdown({
      children: restored === undefined ? [] : [restored],
      type: 'root',
    })).toBe(`${body}\n`);
  });

  it.each([
    [
      'additional attributes',
      '<div class="note" align="right">\n\n문단\n\n</div>\n',
    ],
    [
      'single quotes',
      "<div align='right'>\n\n문단\n\n</div>\n",
    ],
    [
      'left alignment',
      '<div align="left">\n\n문단\n\n</div>\n',
    ],
    [
      'more than one paragraph',
      '<div align="right">\n\n첫 문단\n\n둘째 문단\n\n</div>\n',
    ],
    [
      'text on the opening line',
      '<div align="right">첫 문단\n\n둘째 문단\n\n</div>\n',
    ],
  ])('preserves user HTML with %s', (_name, markdown) => {
    const tree = parseMarkdown(markdown);
    const childCount = getChildren(tree).length;

    restoreDivTextAlignment(tree);

    expect(getChildren(tree)).toHaveLength(childCount);
    expect(getChildren(tree).some(
      (node) => (node as AlignedMarkdownNode).textAlign !== undefined,
    )).toBe(false);
  });

  it('does not reinterpret an exact wrapper nested in a blockquote', () => {
    const tree = {
      children: [{
        children: [
          createHtmlNode('<div align="right">'),
          { children: [{ type: 'text', value: '문단' }], type: 'paragraph' },
          createHtmlNode('</div>'),
        ],
        type: 'blockquote',
      }],
      type: 'root',
    } as MarkdownNode;

    restoreDivTextAlignment(tree);

    const blockquote = getChildren(tree)[0];
    const paragraph = getChildren(blockquote as MarkdownNode)[1] as
      AlignedMarkdownNode | undefined;

    expect(paragraph?.textAlign).toBeUndefined();
    expect(getChildren(blockquote as MarkdownNode)).toHaveLength(3);
  });

  it.each<PersistedTextAlignment>(['center', 'right'])(
    'emits the strict GitHub-compatible %s tags',
    (alignment) => {
      expect(getTextAlignmentDivTags(alignment)).toEqual({
        close: '</div>',
        open: `<div align="${alignment}">`,
      });
    },
  );
});
