import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import {
  bulletListSchema,
  liftListItemCommand,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
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
    } else if (action === 'bullet-list') {
      const bulletListType = bulletListSchema.type(context);
      const { $from } = view.state.selection;
      let isInBulletList = false;

      for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type === bulletListType) {
          isInBulletList = true;
          break;
        }
      }

      commands.call(
        isInBulletList
          ? liftListItemCommand.key
          : wrapInBulletListCommand.key,
      );
    }

    view.focus();
  });
};
