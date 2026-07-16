import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import {
  turnIntoTextCommand,
  wrapInHeadingCommand,
} from '@milkdown/kit/preset/commonmark';

import type { EditorToolbarAction } from './createEditorToolbar';

export const runEditorToolbarAction = (
  editor: Editor,
  action: EditorToolbarAction,
): void => {
  editor.action((context) => {
    const commands = context.get(commandsCtx);

    if (action === 'paragraph') {
      commands.call(turnIntoTextCommand.key);
    } else if (action === 'heading-1') {
      commands.call(wrapInHeadingCommand.key, 1);
    }

    context.get(editorViewCtx).focus();
  });
};
