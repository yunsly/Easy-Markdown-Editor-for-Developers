import { commandsCtx, schemaCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/kit/ctx';
import { setBlockType } from '@milkdown/kit/prose/commands';
import { history, redo, undo } from '@milkdown/kit/prose/history';
import { Schema } from '@milkdown/kit/prose/model';
import {
  EditorState,
  TextSelection,
  type Transaction,
} from '@milkdown/kit/prose/state';
import { describe, expect, it, vi } from 'vitest';

import type { EditorToolbarAction } from './createEditorToolbar';
import { runEditorToolbarAction } from './editorToolbarActions';
import { getActiveTextBlockAction } from './editorToolbarState';

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
      attrs: { level: { default: 1 } },
      content: 'inline*',
      group: 'block',
    },
    paragraph: { content: 'inline*', group: 'block' },
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
    get: (slice: unknown) => slice === commandsCtx ? commands : view,
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
