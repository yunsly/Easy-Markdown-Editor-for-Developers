import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import { lift, wrapIn } from '@milkdown/kit/prose/commands';
import type {
  Node as ProseMirrorNode,
  NodeType,
  ResolvedPos,
} from '@milkdown/kit/prose/model';
import {
  NodeSelection,
  type Selection,
} from '@milkdown/kit/prose/state';
import { isInTable } from '@milkdown/kit/prose/tables';
import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  createCodeBlockCommand,
  imageSchema,
  insertImageCommand,
  liftListItemCommand,
  linkSchema,
  listItemSchema,
  orderedListSchema,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInBlockquoteCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';
import {
  insertTableCommand,
  tableSchema,
} from '@milkdown/kit/preset/gfm';

import type {
  EditorToolbarAction,
  EditorToolbarActionOptions,
} from './createEditorToolbar';

export interface CopiedAttachment {
  kind: 'image' | 'link';
  src: string;
  text: string;
}

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

interface SelectedListNodes {
  items: ReadonlyMap<number, ProseMirrorNode>;
  lists: ReadonlyMap<number, ProseMirrorNode>;
}

const getSelectedListNodes = (
  doc: ProseMirrorNode,
  selection: Selection,
  listItemType: NodeType,
  listTypes: readonly NodeType[],
): SelectedListNodes => {
  const items = new Map<number, ProseMirrorNode>();
  const lists = new Map<number, ProseMirrorNode>();

  if (selection.empty) {
    const listItemDepth = findAncestorDepth(selection.$from, [listItemType]);
    const listDepth = findAncestorDepth(selection.$from, listTypes);

    if (listItemDepth !== undefined) {
      items.set(
        selection.$from.before(listItemDepth),
        selection.$from.node(listItemDepth),
      );
    }

    if (listDepth !== undefined) {
      lists.set(
        selection.$from.before(listDepth),
        selection.$from.node(listDepth),
      );
    }

    return { items, lists };
  }

  doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.type === listItemType) {
      items.set(position, node);
    } else if (listTypes.includes(node.type)) {
      lists.set(position, node);
    }

    return true;
  });

  return { items, lists };
};

export const runEditorToolbarAction = (
  editor: Editor,
  action: EditorToolbarAction,
  options: EditorToolbarActionOptions = {},
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
    } else if (action === 'heading-4') {
      commands.call(wrapInHeadingCommand.key, 4);
    } else if (action === 'heading-5') {
      commands.call(wrapInHeadingCommand.key, 5);
    } else if (action === 'heading-6') {
      commands.call(wrapInHeadingCommand.key, 6);
    } else if (
      action === 'bullet-list' ||
      action === 'ordered-list'
    ) {
      const isBulletList = action === 'bullet-list';
      const bulletListType = bulletListSchema.type(context);
      const orderedListType = orderedListSchema.type(context);
      const listItemType = listItemSchema.type(context);
      const listType = isBulletList ? bulletListType : orderedListType;
      const selected = getSelectedListNodes(
        view.state.doc,
        view.state.selection,
        listItemType,
        [bulletListType, orderedListType],
      );

      if (selected.lists.size === 0) {
        commands.call(
          isBulletList
            ? wrapInBulletListCommand.key
            : wrapInOrderedListCommand.key,
        );
      } else if (
        [...selected.lists.values()].every((list) => list.type === listType) &&
        [...selected.items.values()].every(
          (item) => item.attrs.checked == null,
        )
      ) {
        commands.call(liftListItemCommand.key);
      } else {
        let transaction = view.state.tr;

        for (const [position, item] of selected.items) {
          if (item.attrs.checked != null) {
            transaction = transaction.setNodeMarkup(
              position,
              undefined,
              { ...item.attrs, checked: null },
            );
          }
        }

        for (const [position, list] of selected.lists) {
          if (list.type !== listType) {
            transaction = transaction.setNodeMarkup(position, listType);
          }
        }

        if (transaction.docChanged) {
          view.dispatch(transaction);
        }
      }
    } else if (action === 'task-list') {
      const bulletListType = bulletListSchema.type(context);
      const orderedListType = orderedListSchema.type(context);
      const listItemType = listItemSchema.type(context);
      const selected = getSelectedListNodes(
        view.state.doc,
        view.state.selection,
        listItemType,
        [bulletListType, orderedListType],
      );
      const allItemsAreTasks = selected.items.size > 0 &&
        [...selected.items.values()].every(
          (item) => item.attrs.checked != null,
        );

      if (allItemsAreTasks) {
        commands.call(liftListItemCommand.key);
      } else if (selected.items.size > 0) {
        let transaction = view.state.tr;

        for (const [position, item] of selected.items) {
          if (item.attrs.checked == null) {
            transaction = transaction.setNodeMarkup(
              position,
              undefined,
              { ...item.attrs, checked: false },
            );
          }
        }

        for (const [position, list] of selected.lists) {
          if (list.type !== bulletListType) {
            transaction = transaction.setNodeMarkup(position, bulletListType);
          }
        }

        if (transaction.docChanged) {
          view.dispatch(transaction);
        }
      } else {
        wrapIn(bulletListType)(view.state, (transaction) => {
          const wrapped = getSelectedListNodes(
            transaction.doc,
            transaction.selection,
            listItemType,
            [bulletListType],
          );

          if (wrapped.items.size === 0) {
            return;
          }

          let taskTransaction = transaction;

          for (const [position, item] of wrapped.items) {
            taskTransaction = taskTransaction.setNodeMarkup(
              position,
              undefined,
              { ...item.attrs, checked: false },
            );
          }

          view.dispatch(taskTransaction);
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
    } else if (action === 'code-block') {
      const codeBlockType = codeBlockSchema.type(context);
      const isCodeBlock = view.state.selection.$from.parent.type ===
        codeBlockType;

      commands.call(
        isCodeBlock
          ? turnIntoTextCommand.key
          : createCodeBlockCommand.key,
      );
    } else if (action === 'badge' && options.image !== undefined) {
      const { alt, linkUrl, src } = options.image;

      if (linkUrl === undefined) {
        commands.call(insertImageCommand.key, { alt, src });
      } else {
        const linkMark = linkSchema.type(context).create({
          href: linkUrl,
          title: null,
        });
        const imageNode = imageSchema.type(context).create(
          { alt, src, title: '' },
          undefined,
          [linkMark],
        );
        view.dispatch(
          view.state.tr.replaceSelectionWith(imageNode, false).scrollIntoView(),
        );
      }
    } else if (action === 'table') {
      const { selection } = view.state;
      const isTableSelected = selection instanceof NodeSelection &&
        selection.node.type === tableSchema.type(context);

      if (!isInTable(view.state) && !isTableSelected) {
        commands.call(
          insertTableCommand.key,
          options.tableSize ?? { row: 3, col: 3 },
        );
      }
    }

    view.focus();
  });
};

export const insertCopiedAttachment = (
  editor: Editor,
  attachment: CopiedAttachment,
): void => {
  editor.action((context) => {
    const view = context.get(editorViewCtx);

    if (attachment.kind === 'image') {
      const commands = context.get(commandsCtx);
      commands.call(insertImageCommand.key, {
        alt: attachment.text,
        src: attachment.src,
      });
    } else {
      const linkMark = linkSchema.type(context).create({
        href: attachment.src,
        title: null,
      });
      const linkText = view.state.schema.text(attachment.text, [linkMark]);
      view.dispatch(
        view.state.tr.replaceSelectionWith(linkText, false).scrollIntoView(),
      );
    }

    view.focus();
  });
};
