import type { Ctx } from '@milkdown/kit/ctx';
import { editorViewCtx } from '@milkdown/kit/core';
import {
  NodeSelection,
  type EditorState,
} from '@milkdown/kit/prose/state';
import { isInTable } from '@milkdown/kit/prose/tables';
import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  headingSchema,
  listItemSchema,
  orderedListSchema,
  paragraphSchema,
} from '@milkdown/kit/preset/commonmark';
import { tableSchema } from '@milkdown/kit/preset/gfm';

import type {
  EditorToolbar,
  EditorToolbarAction,
  ParagraphAlignment,
} from './createEditorToolbar';
import { getSelectedTopLevelParagraphs } from './editorToolbarActions';

const textBlockActions = [
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
  'heading-4',
  'heading-5',
  'heading-6',
] as const satisfies readonly EditorToolbarAction[];

const alignmentActions = [
  'align-left',
  'align-center',
  'align-right',
] as const satisfies readonly EditorToolbarAction[];

const getParagraphAlignment = (
  value: unknown,
): ParagraphAlignment =>
  value === 'center' || value === 'right' ? value : 'left';

interface ParagraphAlignmentState {
  alignment: ParagraphAlignment | undefined;
  hasParagraphs: boolean;
}

const getParagraphAlignmentState = (
  context: Ctx,
  state: EditorState,
): ParagraphAlignmentState => {
  const paragraphs = getSelectedTopLevelParagraphs(
    state.doc,
    state.selection,
    paragraphSchema.type(context),
  );
  const first = paragraphs[0];

  if (first === undefined) {
    return { alignment: undefined, hasParagraphs: false };
  }

  const alignment = getParagraphAlignment(first.node.attrs.textAlign);
  const isUniform = paragraphs.every(
    ({ node }) => getParagraphAlignment(node.attrs.textAlign) === alignment,
  );

  return {
    alignment: isUniform ? alignment : undefined,
    hasParagraphs: true,
  };
};

export const getActiveParagraphAlignment = (
  context: Ctx,
  state: EditorState,
): ParagraphAlignment | undefined =>
  getParagraphAlignmentState(context, state).alignment;

export const getActiveTextBlockAction = (
  context: Ctx,
  state: EditorState,
): EditorToolbarAction | undefined => {
  const { selection } = state;
  const node = selection.$from.parent;

  if (node.type === paragraphSchema.type(context)) {
    return 'paragraph';
  }

  if (node.type !== headingSchema.type(context)) {
    return undefined;
  }

  if (node.attrs.level === 1) {
    return 'heading-1';
  }

  if (node.attrs.level === 2) {
    return 'heading-2';
  }

  if (node.attrs.level === 3) {
    return 'heading-3';
  }

  if (node.attrs.level === 4) {
    return 'heading-4';
  }

  if (node.attrs.level === 5) {
    return 'heading-5';
  }

  if (node.attrs.level === 6) {
    return 'heading-6';
  }

  return undefined;
};

interface SelectionListState {
  action: 'bullet-list' | 'ordered-list' | undefined;
  isTask: boolean;
}

const getSelectionListState = (
  context: Ctx,
  state: EditorState,
): SelectionListState => {
  const { $from } = state.selection;
  const bulletListType = bulletListSchema.type(context);
  const orderedListType = orderedListSchema.type(context);
  const listItemType = listItemSchema.type(context);
  let action: SelectionListState['action'];
  let isTask = false;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);

    if (node.type === listItemType) {
      isTask = node.attrs.checked != null;
    } else if (node.type === bulletListType) {
      action = 'bullet-list';
      break;
    } else if (node.type === orderedListType) {
      action = 'ordered-list';
      break;
    }
  }

  return { action, isTask };
};

const updateButtonState = (
  toolbar: EditorToolbar,
  action: EditorToolbarAction,
  isActive: boolean,
): void => {
  const button = toolbar.buttons.get(action);
  button?.classList.toggle('is-active', isActive);

  if (button?.getAttribute('role') === 'menuitemradio') {
    button.setAttribute('aria-checked', String(isActive));
  } else {
    button?.setAttribute('aria-pressed', String(isActive));
  }
};

const isSelectionInBlockquote = (
  context: Ctx,
  state: EditorState,
): boolean => {
  const { $from } = state.selection;
  const blockquoteType = blockquoteSchema.type(context);

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === blockquoteType) {
      return true;
    }
  }

  return false;
};

export const updateEditorToolbarState = (
  context: Ctx,
  toolbar: EditorToolbar,
): boolean | undefined => {
  const editorView = context.get(editorViewCtx);

  if (!('state' in editorView)) {
    return;
  }

  const { state } = editorView;
  const activeAction = getActiveTextBlockAction(context, state);
  const paragraphAlignment = getParagraphAlignmentState(context, state);
  const listState = getSelectionListState(context, state);
  const isTableActive = isInTable(state) ||
    (state.selection instanceof NodeSelection &&
      state.selection.node.type === tableSchema.type(context));

  for (const action of textBlockActions) {
    updateButtonState(toolbar, action, action === activeAction);
  }

  const activeHeadingLevel = activeAction === 'heading-4'
    ? 4
    : activeAction === 'heading-5'
      ? 5
      : activeAction === 'heading-6'
        ? 6
        : undefined;
  toolbar.headingMenu.setActiveLevel(activeHeadingLevel);

  for (const action of alignmentActions) {
    const button = toolbar.buttons.get(action);
    const alignment = action === 'align-left'
      ? 'left'
      : action === 'align-center'
        ? 'center'
        : 'right';
    button?.toggleAttribute('disabled', !paragraphAlignment.hasParagraphs);
    updateButtonState(
      toolbar,
      action,
      alignment === paragraphAlignment.alignment,
    );
  }
  toolbar.alignmentMenu.button.toggleAttribute(
    'disabled',
    !paragraphAlignment.hasParagraphs,
  );
  toolbar.alignmentMenu.setActiveAlignment(paragraphAlignment.alignment);

  if (!paragraphAlignment.hasParagraphs) {
    toolbar.alignmentMenu.close();
  }

  updateButtonState(
    toolbar,
    'bullet-list',
    !listState.isTask && listState.action === 'bullet-list',
  );
  updateButtonState(
    toolbar,
    'ordered-list',
    !listState.isTask && listState.action === 'ordered-list',
  );
  updateButtonState(toolbar, 'task-list', listState.isTask);
  updateButtonState(
    toolbar,
    'blockquote',
    isSelectionInBlockquote(context, state),
  );
  updateButtonState(
    toolbar,
    'code-block',
    state.selection.$from.parent.type ===
      codeBlockSchema.type(context),
  );
  updateButtonState(toolbar, 'table', isTableActive);

  return isTableActive;
};
