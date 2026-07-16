import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import {
  bulletListSchema,
  liftListItemCommand,
  orderedListSchema,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';

import type { EditorToolbarAction } from './createEditorToolbar';

export const runEditorToolbarAction = (
  editor: Editor,
  action: EditorToolbarAction,
): void => {
  editor.action((context) => {
    const commands = context.get(commandsCtx);
    const view = context.get(editorViewCtx);

    if (action === 'paragraph') {
      commands.call(turnIntoTextCommand.key);
    } else if (action === 'heading-1') {
      commands.call(wrapInHeadingCommand.key, 1);
    } else if (action === 'heading-2') {
      commands.call(wrapInHeadingCommand.key, 2);
    } else if (action === 'heading-3') {
      commands.call(wrapInHeadingCommand.key, 3);
    } else if (
      action === 'bullet-list' ||
      action === 'ordered-list'
    ) {
      const isBulletList = action === 'bullet-list';
      const bulletListType = bulletListSchema.type(context);
      const orderedListType = orderedListSchema.type(context);
      const listType = isBulletList ? bulletListType : orderedListType;
      const { $from } = view.state.selection;
      let currentListDepth: number | undefined;

      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const nodeType = $from.node(depth).type;

        if (nodeType === bulletListType || nodeType === orderedListType) {
          currentListDepth = depth;
          break;
        }
      }

      if (currentListDepth === undefined) {
        commands.call(
          isBulletList
            ? wrapInBulletListCommand.key
            : wrapInOrderedListCommand.key,
        );
      } else if ($from.node(currentListDepth).type === listType) {
        commands.call(liftListItemCommand.key);
      } else {
        view.dispatch(
          view.state.tr.setNodeMarkup(
            $from.before(currentListDepth),
            listType,
          ),
        );
      }
    }

    view.focus();
  });
};
