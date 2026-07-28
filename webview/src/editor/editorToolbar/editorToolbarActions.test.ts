import {
  commandsCtx,
  editorViewCtx,
  schemaCtx,
} from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/kit/ctx';
import { setBlockType } from '@milkdown/kit/prose/commands';
import { history, redo, undo } from '@milkdown/kit/prose/history';
import {
  type Node as ProseMirrorNode,
  Schema,
} from '@milkdown/kit/prose/model';
import {
  EditorState,
  NodeSelection,
  TextSelection,
  type Transaction,
} from '@milkdown/kit/prose/state';
import type { MarkdownNode } from '@milkdown/kit/transformer';
import { remark } from 'remark';
import { describe, expect, it, vi } from 'vitest';

import {
  replaceHeadingSchemaPreservingOrder,
  restoreDivTextAlignment,
  type PersistedTextAlignment,
} from '../textAlignmentMarkdown';
import type { EditorToolbarAction } from './createEditorToolbar';
import { runEditorToolbarAction } from './editorToolbarActions';
import {
  getActiveTextBlockAlignment,
  getActiveTextBlockAction,
} from './editorToolbarState';

const schema = new Schema({
  marks: {
    link: {
      attrs: { href: {} },
    },
    strong: {},
  },
  nodes: {
    doc: { content: 'block+' },
    heading: {
      attrs: {
        level: { default: 1 },
        textAlign: { default: null },
      },
      content: 'inline*',
      group: 'block',
    },
    paragraph: {
      attrs: { textAlign: { default: null } },
      content: 'inline*',
      group: 'block',
    },
    image: {
      attrs: {
        alt: { default: '' },
        src: {},
        title: { default: null },
      },
      group: 'inline',
      inline: true,
    },
    bullet_list: {
      attrs: { spread: { default: false } },
      content: 'listItem+',
      group: 'block',
    },
    ordered_list: {
      attrs: {
        order: { default: 1 },
        spread: { default: false },
      },
      content: 'listItem+',
      group: 'block',
    },
    list_item: {
      attrs: {
        checked: { default: null },
        label: { default: '•' },
        listType: { default: 'bullet' },
        spread: { default: true },
      },
      content: 'paragraph block*',
      defining: true,
      group: 'listItem',
    },
    text: { group: 'inline' },
  },
});

const textBlock = (
  type: 'heading' | 'paragraph',
  level = 1,
) => schema.node(
  type,
  type === 'heading' ? { level } : undefined,
  [
    schema.text('굵은 한글', [schema.marks.strong.create()]),
    schema.text('과 '),
    schema.text('링크', [
      schema.marks.link.create({ href: 'https://example.com' }),
    ]),
  ],
);

interface HeadingHarness {
  getState: () => EditorState;
  redo: () => boolean;
  run: (action: EditorToolbarAction) => void;
  undo: () => boolean;
}

const createHeadingHarness = (
  type: 'heading' | 'paragraph',
  level = 1,
  multipleBlocks = false,
): HeadingHarness => {
  const blocks = multipleBlocks
    ? [textBlock(type, level), textBlock(type, level)]
    : [textBlock(type, level)];
  const doc = schema.node('doc', undefined, blocks);
  const selection = multipleBlocks
    ? TextSelection.create(doc, 1, doc.content.size - 1)
    : TextSelection.create(doc, 1);
  let state = EditorState.create({
    doc,
    plugins: [history()],
    selection,
  });
  const dispatch = (transaction: Transaction): void => {
    state = state.apply(transaction);
  };
  const view = {
    dispatch,
    focus: vi.fn(),
    get state() {
      return state;
    },
  };
  const commands = {
    call: (_command: unknown, payload?: unknown): boolean => {
      if (typeof payload === 'number') {
        return setBlockType(schema.nodes.heading, { level: payload })(
          state,
          dispatch,
        );
      }

      if (payload === undefined) {
        return setBlockType(schema.nodes.paragraph)(state, dispatch);
      }

      return false;
    },
  };
  const context = {
    get: (slice: unknown) => {
      if (slice === commandsCtx) return commands;
      if (slice === editorViewCtx) return view;
      if (slice === schemaCtx) return schema;
      return undefined;
    },
  } as unknown as Ctx;
  const editor = {
    action: (action: (context: Ctx) => void) => action(context),
  } as unknown as Editor;

  return {
    getState: () => state,
    redo: () => redo(state, dispatch),
    run: (action) => runEditorToolbarAction(editor, action),
    undo: () => undo(state, dispatch),
  };
};

const headingAction = (level: number): EditorToolbarAction =>
  `heading-${level}` as EditorToolbarAction;

describe('extended heading toolbar actions', () => {
  it.each([4, 5, 6])('turns a paragraph into heading %s', (level) => {
    const harness = createHeadingHarness('paragraph');

    harness.run(headingAction(level));

    expect(harness.getState().doc.firstChild?.type).toBe(schema.nodes.heading);
    expect(harness.getState().doc.firstChild?.attrs.level).toBe(level);
  });

  it.each([
    [4, 5],
    [1, 4],
    [4, 2],
  ])('changes heading %s into heading %s', (from, to) => {
    const harness = createHeadingHarness('heading', from);

    harness.run(headingAction(to));

    expect(harness.getState().doc.firstChild?.attrs.level).toBe(to);
  });

  it('turns heading 5 back into a paragraph', () => {
    const harness = createHeadingHarness('heading', 5);

    harness.run('paragraph');

    expect(harness.getState().doc.firstChild?.type).toBe(
      schema.nodes.paragraph,
    );
  });

  it('keeps the current command policy when heading 6 is reapplied', () => {
    const harness = createHeadingHarness('heading', 6);
    const before = harness.getState().doc;

    harness.run('heading-6');

    expect(harness.getState().doc).toBe(before);
  });

  it('changes all selected text blocks using the existing heading policy', () => {
    const harness = createHeadingHarness('paragraph', 1, true);

    harness.run('heading-4');

    expect(harness.getState().doc.child(0).attrs.level).toBe(4);
    expect(harness.getState().doc.child(1).attrs.level).toBe(4);
  });

  it('preserves Korean text and inline marks across heading levels', () => {
    const harness = createHeadingHarness('heading', 4);

    harness.run('heading-6');

    const heading = harness.getState().doc.firstChild;
    expect(heading?.textContent).toBe('굵은 한글과 링크');
    expect(heading?.child(0).marks[0]?.type).toBe(schema.marks.strong);
    expect(heading?.child(2).marks[0]?.type).toBe(schema.marks.link);
  });

  it('undoes and redoes one heading transaction', () => {
    const harness = createHeadingHarness('paragraph');

    harness.run('heading-6');
    expect(harness.getState().doc.firstChild?.attrs.level).toBe(6);

    expect(harness.undo()).toBe(true);
    expect(harness.getState().doc.firstChild?.type).toBe(
      schema.nodes.paragraph,
    );

    expect(harness.redo()).toBe(true);
    expect(harness.getState().doc.firstChild?.attrs.level).toBe(6);
  });
});

describe('extended heading active state', () => {
  it.each([1, 2, 3, 4, 5, 6])(
    'reports heading %s for its block',
    (level) => {
      const doc = schema.node('doc', undefined, textBlock('heading', level));
      const state = EditorState.create({
        doc,
        selection: TextSelection.create(doc, 1),
      });
      const context = {
        get: (slice: unknown) => slice === schemaCtx ? schema : undefined,
      } as unknown as Ctx;

      expect(getActiveTextBlockAction(context, state)).toBe(
        headingAction(level),
      );
    },
  );
});

type ListKind = 'bullet_list' | 'ordered_list';

interface ListHarness {
  getState: () => EditorState;
  run: (action: EditorToolbarAction) => void;
  undo: () => boolean;
}

const createListItem = (text: string, checked: boolean | null = null) =>
  schema.node('list_item', { checked }, [
    schema.node('paragraph', undefined, schema.text(text)),
  ]);

const selectAllTextBlockText = (doc: ProseMirrorNode) => {
  const positions: Array<{ from: number; to: number }> = [];

  doc.descendants((node, position) => {
    if (
      node.type === schema.nodes.paragraph ||
      node.type === schema.nodes.heading
    ) {
      positions.push({
        from: position + 1,
        to: position + 1 + node.content.size,
      });
      return false;
    }

    return true;
  });

  const first = positions[0];
  const last = positions.at(-1);

  if (first === undefined || last === undefined) {
    throw new Error('Expected the document to contain text block content.');
  }

  return TextSelection.create(doc, first.from, last.to);
};

type AlignmentSelection = (doc: ProseMirrorNode) =>
  NodeSelection | TextSelection;

interface AlignmentHarness {
  getState: () => EditorState;
  redo: () => boolean;
  run: (action: EditorToolbarAction) => void;
  undo: () => boolean;
}

const alignedParagraph = (
  text: string,
  textAlign: 'center' | 'right' | null = null,
) => schema.node(
  'paragraph',
  { textAlign },
  schema.text(text),
);

const alignedHeading = (
  text: string,
  level = 2,
  textAlign: 'center' | 'right' | null = null,
) => schema.node(
  'heading',
  { level, textAlign },
  schema.text(text),
);

const imageParagraph = (
  textAlign: 'center' | 'right' | null = null,
) => schema.node('paragraph', { textAlign }, [
  schema.node('image', {
    alt: '미리보기',
    src: './image.png',
    title: null,
  }),
]);

const createAlignmentHarness = (
  blocks: readonly ProseMirrorNode[],
  createSelection: AlignmentSelection = selectAllTextBlockText,
): AlignmentHarness => {
  const doc = schema.node('doc', undefined, blocks);
  let state = EditorState.create({
    doc,
    plugins: [history()],
    selection: createSelection(doc),
  });
  const dispatch = (transaction: Transaction): void => {
    state = state.apply(transaction);
  };
  const view = {
    dispatch,
    focus: vi.fn(),
    get state() {
      return state;
    },
  };
  const commands = { call: vi.fn(() => false) };
  const context = {
    get: (slice: unknown) => {
      if (slice === commandsCtx) return commands;
      if (slice === editorViewCtx) return view;
      if (slice === schemaCtx) return schema;
      return undefined;
    },
  } as unknown as Ctx;
  const editor = {
    action: (action: (currentContext: Ctx) => void) => action(context),
  } as unknown as Editor;

  return {
    getState: () => state,
    redo: () => redo(state, dispatch),
    run: (action) => runEditorToolbarAction(editor, action),
    undo: () => undo(state, dispatch),
  };
};

const topLevelParagraphAlignments = (
  state: EditorState,
): unknown[] => {
  const alignments: unknown[] = [];

  state.doc.forEach((node) => {
    if (node.type === schema.nodes.paragraph) {
      alignments.push(node.attrs.textAlign);
    }
  });

  return alignments;
};

describe('text block alignment toolbar actions', () => {
  it('aligns selected text and image paragraphs in one transaction', () => {
    const harness = createAlignmentHarness([
      textBlock('paragraph'),
      imageParagraph(),
    ]);

    harness.run('align-center');

    expect(topLevelParagraphAlignments(harness.getState())).toEqual([
      'center',
      'center',
    ]);
    expect(harness.getState().doc.child(0).child(0).marks[0]?.type).toBe(
      schema.marks.strong,
    );
    expect(harness.getState().doc.child(1).child(0).attrs.src).toBe(
      './image.png',
    );

    expect(harness.undo()).toBe(true);
    expect(topLevelParagraphAlignments(harness.getState())).toEqual([
      null,
      null,
    ]);
    expect(harness.redo()).toBe(true);
    expect(topLevelParagraphAlignments(harness.getState())).toEqual([
      'center',
      'center',
    ]);
  });

  it('aligns an image-only paragraph from an image node selection', () => {
    const harness = createAlignmentHarness(
      [imageParagraph()],
      (doc) => NodeSelection.create(doc, 1),
    );

    harness.run('align-right');

    expect(topLevelParagraphAlignments(harness.getState())).toEqual([
      'right',
    ]);
  });

  it('uses left alignment to remove persisted alignment attributes', () => {
    const harness = createAlignmentHarness([
      alignedParagraph('첫 문단', 'center'),
      alignedParagraph('둘째 문단', 'right'),
    ]);

    harness.run('align-left');

    expect(topLevelParagraphAlignments(harness.getState())).toEqual([
      null,
      null,
    ]);
  });

  it('aligns selected headings and paragraphs together', () => {
    const harness = createAlignmentHarness([
      alignedHeading('제목', 2),
      alignedParagraph('일반 문단'),
    ]);

    harness.run('align-right');

    expect(harness.getState().doc.child(0).attrs).toMatchObject({
      level: 2,
      textAlign: 'right',
    });
    expect(harness.getState().doc.child(1).attrs.textAlign).toBe('right');
  });

  it('uses left alignment to remove heading alignment', () => {
    const harness = createAlignmentHarness([
      alignedHeading('제목', 4, 'center'),
    ]);

    harness.run('align-left');

    expect(harness.getState().doc.firstChild?.attrs).toMatchObject({
      level: 4,
      textAlign: null,
    });
  });

  it('preserves alignment while changing text block types and levels', () => {
    const headingHarness = createAlignmentHarness([
      alignedHeading('제목', 2, 'right'),
    ]);
    const paragraphHarness = createAlignmentHarness([
      alignedParagraph('문단', 'center'),
    ]);

    headingHarness.run('heading-5');
    expect(headingHarness.getState().doc.firstChild?.attrs).toMatchObject({
      level: 5,
      textAlign: 'right',
    });

    headingHarness.run('paragraph');
    expect(headingHarness.getState().doc.firstChild?.attrs.textAlign).toBe(
      'right',
    );

    paragraphHarness.run('heading-3');
    expect(paragraphHarness.getState().doc.firstChild?.attrs).toMatchObject({
      level: 3,
      textAlign: 'center',
    });
  });

  it('skips paragraphs nested in lists', () => {
    const list = schema.node('bullet_list', undefined, [
      schema.node('list_item', undefined, [alignedParagraph('목록 문단')]),
    ]);
    const harness = createAlignmentHarness([
      list,
      alignedParagraph('일반 문단'),
    ]);

    harness.run('align-center');

    expect(
      harness.getState().doc.child(0).firstChild?.firstChild?.attrs.textAlign,
    ).toBeNull();
    expect(harness.getState().doc.child(1).attrs.textAlign).toBe('center');
  });
});

describe('text block alignment active state', () => {
  const context = {
    get: (slice: unknown) => slice === schemaCtx ? schema : undefined,
  } as unknown as Ctx;

  it.each([
    [null, 'left'],
    ['center', 'center'],
    ['right', 'right'],
  ] as const)('reports %s as %s', (textAlign, expected) => {
    const doc = schema.node(
      'doc',
      undefined,
      alignedParagraph('문단', textAlign),
    );
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 1),
    });

    expect(getActiveTextBlockAlignment(context, state)).toBe(expected);
  });

  it('reports no active value for a mixed selection', () => {
    const doc = schema.node('doc', undefined, [
      alignedParagraph('첫 문단', 'center'),
      alignedParagraph('둘째 문단', 'right'),
    ]);
    const state = EditorState.create({
      doc,
      selection: selectAllTextBlockText(doc),
    });

    expect(getActiveTextBlockAlignment(context, state)).toBeUndefined();
  });

  it('reports a heading alignment and a uniform mixed-block alignment', () => {
    const headingDoc = schema.node('doc', undefined, [
      alignedHeading('제목', 3, 'right'),
    ]);
    const headingState = EditorState.create({
      doc: headingDoc,
      selection: TextSelection.create(headingDoc, 1),
    });
    const mixedDoc = schema.node('doc', undefined, [
      alignedHeading('제목', 3, 'center'),
      alignedParagraph('문단', 'center'),
    ]);
    const mixedState = EditorState.create({
      doc: mixedDoc,
      selection: selectAllTextBlockText(mixedDoc),
    });

    expect(getActiveTextBlockAlignment(context, headingState)).toBe('right');
    expect(getActiveTextBlockAlignment(context, mixedState)).toBe('center');
  });

  it('reports no active value inside a list', () => {
    const doc = schema.node('doc', undefined, [
      schema.node('bullet_list', undefined, [
        schema.node('list_item', undefined, [alignedParagraph('목록 문단')]),
      ]),
    ]);
    const state = EditorState.create({
      doc,
      selection: selectAllTextBlockText(doc),
    });

    expect(getActiveTextBlockAlignment(context, state)).toBeUndefined();
  });
});

describe('heading alignment Markdown contract', () => {
  it.each<PersistedTextAlignment>(['center', 'right'])(
    'restores an exact %s wrapper around one heading',
    (alignment) => {
      const root = remark().parse([
        `<div align="${alignment}">`,
        '',
        '#### 제목',
        '',
        '</div>',
        '',
      ].join('\n')) as MarkdownNode;

      restoreDivTextAlignment(root);

      const children = root.children ?? [];

      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({
        depth: 4,
        textAlign: alignment,
        type: 'heading',
      });
    },
  );

  it('extends heading in place without changing the default paragraph', () => {
    const markdownSchema = {
      parseMarkdown: { match: () => false, runner: () => undefined },
      toMarkdown: { match: () => false, runner: () => undefined },
    };
    const nodes = [
      ['doc', { ...markdownSchema, content: 'block+' }],
      ['paragraph', {
        ...markdownSchema,
        content: 'inline*',
        group: 'block',
      }],
      ['heading', {
        ...markdownSchema,
        content: 'inline*',
        group: 'block',
      }],
      ['text', { ...markdownSchema, group: 'inline' }],
    ] as Parameters<typeof replaceHeadingSchemaPreservingOrder>[0];

    const updated = replaceHeadingSchemaPreservingOrder(
      nodes,
      (heading) => ({
        ...heading,
        attrs: { textAlign: { default: null } },
      }),
    );
    const updatedSchema = new Schema({ nodes: Object.fromEntries(updated) });

    expect(updated.map(([id]) => id)).toEqual([
      'doc',
      'paragraph',
      'heading',
      'text',
    ]);
    expect(updatedSchema.nodes.doc?.contentMatch.defaultType).toBe(
      updatedSchema.nodes.paragraph,
    );
    expect(updatedSchema.nodes.heading?.spec.attrs?.textAlign?.default).toBe(
      null,
    );
  });
});

const createListHarness = (
  kind: ListKind | 'paragraphs',
  checkedValues: readonly (boolean | null)[] = [null, null, null],
): ListHarness => {
  const paragraphs = checkedValues.map((_, index) =>
    schema.node('paragraph', undefined, schema.text(`item ${index + 1}`))
  );
  const blocks = kind === 'paragraphs'
    ? paragraphs
    : [
      schema.node(
        kind,
        undefined,
        checkedValues.map((checked, index) =>
          createListItem(`item ${index + 1}`, checked)
        ),
      ),
    ];
  const doc = schema.node('doc', undefined, blocks);
  let state = EditorState.create({
    doc,
    plugins: [history()],
    selection: selectAllTextBlockText(doc),
  });
  const dispatch = (transaction: Transaction): void => {
    state = state.apply(transaction);
  };
  const view = {
    dispatch,
    focus: vi.fn(),
    get state() {
      return state;
    },
  };
  const commands = { call: vi.fn(() => false) };
  const context = {
    get: (slice: unknown) => {
      if (slice === commandsCtx) return commands;
      if (slice === editorViewCtx) return view;
      if (slice === schemaCtx) return schema;
      return undefined;
    },
  } as unknown as Ctx;
  const editor = {
    action: (action: (currentContext: Ctx) => void) => action(context),
  } as unknown as Editor;

  return {
    getState: () => state,
    run: (action) => runEditorToolbarAction(editor, action),
    undo: () => undo(state, dispatch),
  };
};

const getListItemCheckedValues = (state: EditorState) => {
  const values: Array<boolean | null> = [];

  state.doc.descendants((node) => {
    if (node.type === schema.nodes.list_item) {
      values.push(node.attrs.checked as boolean | null);
    }
  });

  return values;
};

describe('multi-selection list toolbar actions', () => {
  it.each<ListKind>(['bullet_list', 'ordered_list'])(
    'turns every selected %s item into a task item',
    (kind) => {
      const harness = createListHarness(kind);

      harness.run('task-list');

      expect(harness.getState().doc.firstChild?.type).toBe(
        schema.nodes.bullet_list,
      );
      expect(getListItemCheckedValues(harness.getState())).toEqual([
        false,
        false,
        false,
      ]);

      expect(harness.undo()).toBe(true);
      expect(harness.getState().doc.firstChild?.type).toBe(schema.nodes[kind]);
      expect(getListItemCheckedValues(harness.getState())).toEqual([
        null,
        null,
        null,
      ]);
    },
  );

  it.each([
    ['bullet-list', 'bullet_list'],
    ['ordered-list', 'ordered_list'],
  ] as const)(
    'turns every selected task item into a %s',
    (action, expectedType) => {
      const harness = createListHarness('bullet_list', [false, true, false]);

      harness.run(action);

      expect(harness.getState().doc.firstChild?.type).toBe(
        schema.nodes[expectedType],
      );
      expect(getListItemCheckedValues(harness.getState())).toEqual([
        null,
        null,
        null,
      ]);
    },
  );

  it('preserves paragraph wrapping while marking the result as a task', () => {
    const harness = createListHarness('paragraphs');

    harness.run('task-list');

    expect(harness.getState().doc.firstChild?.type).toBe(
      schema.nodes.bullet_list,
    );
    expect(getListItemCheckedValues(harness.getState())).toEqual([false]);
    expect(harness.getState().doc.firstChild?.firstChild?.childCount).toBe(3);
  });
});
