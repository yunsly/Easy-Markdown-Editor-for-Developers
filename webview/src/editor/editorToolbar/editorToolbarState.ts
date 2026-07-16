import type { Ctx } from '@milkdown/kit/ctx';
import { editorViewCtx } from '@milkdown/kit/core';
import type { EditorState } from '@milkdown/kit/prose/state';
import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  headingSchema,
  listItemSchema,
  orderedListSchema,
  paragraphSchema,
} from '@milkdown/kit/preset/commonmark';

import type {
  EditorToolbar,
  EditorToolbarAction,
} from './createEditorToolbar';

const textBlockActions = [
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
] as const satisfies readonly EditorToolbarAction[];

const getActiveTextBlockAction = (
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
  button?.setAttribute('aria-pressed', String(isActive));
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
): void => {
  const editorView = context.get(editorViewCtx);

  if (!('state' in editorView)) {
    return;
  }

  const { state } = editorView;
  const activeAction = getActiveTextBlockAction(context, state);
  const listState = getSelectionListState(context, state);

  for (const action of textBlockActions) {
    updateButtonState(toolbar, action, action === activeAction);
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
};
