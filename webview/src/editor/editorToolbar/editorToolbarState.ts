import type { Ctx } from '@milkdown/kit/ctx';
import { editorViewCtx } from '@milkdown/kit/core';
import {
  bulletListSchema,
  headingSchema,
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
): EditorToolbarAction | undefined => {
  const { selection } = context.get(editorViewCtx).state;
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

const isSelectionInBulletList = (context: Ctx): boolean => {
  const { $from } = context.get(editorViewCtx).state.selection;
  const bulletListType = bulletListSchema.type(context);

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === bulletListType) {
      return true;
    }
  }

  return false;
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

export const updateEditorToolbarState = (
  context: Ctx,
  toolbar: EditorToolbar,
): void => {
  const activeAction = getActiveTextBlockAction(context);

  for (const action of textBlockActions) {
    updateButtonState(toolbar, action, action === activeAction);
  }

  updateButtonState(
    toolbar,
    'bullet-list',
    isSelectionInBulletList(context),
  );
};
