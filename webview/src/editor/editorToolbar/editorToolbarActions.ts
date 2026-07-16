import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import { lift, wrapIn } from '@milkdown/kit/prose/commands';
import type {
  NodeType,
  ResolvedPos,
} from '@milkdown/kit/prose/model';
import {
  blockquoteSchema,
  bulletListSchema,
  liftListItemCommand,
  listItemSchema,
  orderedListSchema,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInBlockquoteCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';

import type { EditorToolbarAction } from './createEditorToolbar';

const findAncestorDepth = (
  position: ResolvedPos,
  nodeTypes: readonly NodeType[],
): number | undefined => {
  for (let depth = position.depth; depth > 0; depth -= 1) {
    if (nodeTypes.includes(position.node(depth).type)) {
      return depth;
    }
  }

  return undefined;
};

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
      const listItemType = listItemSchema.type(context);
      const listType = isBulletList ? bulletListType : orderedListType;
      const { $from } = view.state.selection;
      const currentListDepth = findAncestorDepth(
        $from,
        [bulletListType, orderedListType],
      );
      const listItemDepth = findAncestorDepth($from, [listItemType]);
      const listItem = listItemDepth === undefined
        ? undefined
        : $from.node(listItemDepth);
      const isTaskItem = listItem?.attrs.checked != null;

      if (currentListDepth === undefined) {
        commands.call(
          isBulletList
            ? wrapInBulletListCommand.key
            : wrapInOrderedListCommand.key,
        );
      } else if (
        $from.node(currentListDepth).type === listType &&
        !isTaskItem
      ) {
        commands.call(liftListItemCommand.key);
      } else {
        let transaction = view.state.tr;

        if (isTaskItem && listItemDepth !== undefined && listItem) {
          transaction = transaction.setNodeMarkup(
            $from.before(listItemDepth),
            undefined,
            { ...listItem.attrs, checked: null },
          );
        }

        if ($from.node(currentListDepth).type !== listType) {
          transaction = transaction.setNodeMarkup(
            $from.before(currentListDepth),
            listType,
          );
        }

        view.dispatch(transaction);
      }
    } else if (action === 'task-list') {
      const bulletListType = bulletListSchema.type(context);
      const listItemType = listItemSchema.type(context);
      const { $from } = view.state.selection;
      const listItemDepth = findAncestorDepth($from, [listItemType]);
      const listItem = listItemDepth === undefined
        ? undefined
        : $from.node(listItemDepth);

      if (listItem?.attrs.checked != null) {
        commands.call(liftListItemCommand.key);
      } else if (listItemDepth !== undefined && listItem) {
        view.dispatch(
          view.state.tr.setNodeMarkup(
            $from.before(listItemDepth),
            undefined,
            { ...listItem.attrs, checked: false },
          ),
        );
      } else {
        wrapIn(bulletListType)(view.state, (transaction) => {
          const wrappedPosition = transaction.selection.$from;
          const wrappedItemDepth = findAncestorDepth(
            wrappedPosition,
            [listItemType],
          );

          if (wrappedItemDepth === undefined) {
            return;
          }

          const wrappedItem = wrappedPosition.node(wrappedItemDepth);
          view.dispatch(
            transaction.setNodeMarkup(
              wrappedPosition.before(wrappedItemDepth),
              undefined,
              { ...wrappedItem.attrs, checked: false },
            ),
          );
        });
      }
    } else if (action === 'blockquote') {
      const blockquoteType = blockquoteSchema.type(context);
      const { $from } = view.state.selection;
      const blockquoteDepth = findAncestorDepth($from, [blockquoteType]);

      if (blockquoteDepth === undefined) {
        commands.call(wrapInBlockquoteCommand.key);
      } else {
        commands.inline(lift);
      }
    }

    view.focus();
  });
};
