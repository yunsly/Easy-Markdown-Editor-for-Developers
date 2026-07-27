import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { lift, wrapIn } from '@milkdown/kit/prose/commands';
import type {
  NodeType,
  ResolvedPos,
} from '@milkdown/kit/prose/model';
import { NodeSelection } from '@milkdown/kit/prose/state';
import { isInTable } from '@milkdown/kit/prose/tables';
import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  createCodeBlockCommand,
  headingAttr,
  headingIdGenerator,
  headingSchema,
  imageSchema,
  insertImageCommand,
  liftListItemCommand,
  linkSchema,
  listItemSchema,
  orderedListSchema,
  paragraphAttr,
  paragraphSchema,
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
import type { Node as MarkdownNode } from '@milkdown/kit/transformer';
import { $remark } from '@milkdown/kit/utils';

import type {
  EditorToolbarAction,
  EditorToolbarActionOptions,
} from './createEditorToolbar';

export interface CopiedAttachment {
  kind: 'image' | 'link';
  src: string;
  text: string;
}

type TextAlignment = 'center' | 'right';

const alignmentMarkerPattern =
  /^<!--\s*easy-markdown-editor-align:(center|right)\s*-->$/;

const getMarkerValue = (node: MarkdownNode): string | undefined => {
  if (node.type === 'html' && 'value' in node) {
    return typeof node.value === 'string' ? node.value : undefined;
  }

  if (
    node.type === 'paragraph' &&
    'children' in node &&
    Array.isArray(node.children) &&
    node.children.length === 1
  ) {
    return getMarkerValue(node.children[0] as MarkdownNode);
  }

  return undefined;
};

const restoreTextAlignment = (node: MarkdownNode): void => {
  if (!('children' in node) || !Array.isArray(node.children)) {
    return;
  }

  const children = node.children as MarkdownNode[];

  for (let index = 0; index < children.length; index += 1) {
    const current = children[index];
    const next = children[index + 1];
    const markerMatch = current === undefined
      ? undefined
      : getMarkerValue(current)?.trim().match(alignmentMarkerPattern);

    if (
      markerMatch != null &&
      markerMatch[1] !== undefined &&
      next !== undefined &&
      (next.type === 'paragraph' || next.type === 'heading')
    ) {
      (next as MarkdownNode & { textAlign?: string }).textAlign = markerMatch[1];
      children.splice(index, 1);
      index -= 1;
      continue;
    }

    if (current !== undefined) {
      restoreTextAlignment(current);
    }
  }
};

const remarkTextAlignment = $remark(
  'remarkTextAlignment',
  () => () => restoreTextAlignment,
);

const extendTextBlockSchema = (
  baseSchema: typeof paragraphSchema | typeof headingSchema,
) => baseSchema.extendSchema((previous) => (context) => {
  const schema = previous(context);

  return {
    ...schema,
    attrs: {
      ...schema.attrs,
      textAlign: {
        default: null,
        validate: 'string|null',
      },
    },
    toDOM: (node) => {
      const textAlign = node.attrs.textAlign as TextAlignment | null;
      const element = node.type.name === 'heading'
        ? `h${String(node.attrs.level)}`
        : 'p';
      const headingId = node.attrs.id as unknown;
      const attributes = node.type.name === 'heading'
        ? {
          ...context.get(headingAttr.key)(node),
          id: typeof headingId === 'string' && headingId.length > 0
            ? headingId
            : context.get(headingIdGenerator.key)(node),
        }
        : context.get(paragraphAttr.key)(node);

      return [
        element,
        textAlign === null
          ? attributes
          : { ...attributes, align: textAlign },
        0,
      ];
    },
    parseMarkdown: {
      ...schema.parseMarkdown,
      runner: (state, node, type) => {
        const textAlign = node.textAlign === 'center' ||
            node.textAlign === 'right'
          ? node.textAlign
          : null;
        const attrs = node.type === 'heading'
          ? { level: node.depth as number, textAlign }
          : { textAlign };

        state.openNode(type, attrs);
        state.next(node.children);
        state.closeNode();
      },
    },
    toMarkdown: {
      ...schema.toMarkdown,
      runner: (state, node) => {
        const textAlign = node.attrs.textAlign as TextAlignment | null;

        if (textAlign !== null) {
          state.addNode(
            'html',
            undefined,
            `<!-- easy-markdown-editor-align:${textAlign} -->`,
          );
        }

        schema.toMarkdown.runner(state, node);
      },
    },
  };
});

const paragraphTextAlignmentSchema = extendTextBlockSchema(paragraphSchema);
const headingTextAlignmentSchema = extendTextBlockSchema(headingSchema);

export const textAlignmentPlugins: MilkdownPlugin[] = [
  remarkTextAlignment,
  paragraphTextAlignmentSchema,
  headingTextAlignmentSchema,
].flat();

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
    } else if (action === 'code-block') {
      const codeBlockType = codeBlockSchema.type(context);
      const isCodeBlock = view.state.selection.$from.parent.type ===
        codeBlockType;

      commands.call(
        isCodeBlock
          ? turnIntoTextCommand.key
          : createCodeBlockCommand.key,
      );
    } else if (
      action === 'align-left' ||
      action === 'align-center' ||
      action === 'align-right'
    ) {
      if (isInTable(view.state)) {
        view.focus();
        return;
      }

      const textAlign = action === 'align-center'
        ? 'center'
        : action === 'align-right'
          ? 'right'
          : null;
      const paragraphType = paragraphSchema.type(context);
      const headingType = headingSchema.type(context);
      const { selection } = view.state;
      const positions = new Map<number, NodeType>();

      if (selection.empty) {
        const { $from } = selection;

        if ($from.parent.type === paragraphType || $from.parent.type === headingType) {
          positions.set($from.before($from.depth), $from.parent.type);
        }
      } else {
        view.state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
          if (node.type === paragraphType || node.type === headingType) {
            positions.set(position, node.type);
            return false;
          }

          return true;
        });
      }

      let transaction = view.state.tr;

      for (const [position] of positions) {
        const node = transaction.doc.nodeAt(position);

        if (node !== null) {
          transaction = transaction.setNodeMarkup(position, undefined, {
            ...node.attrs,
            textAlign,
          });
        }
      }

      if (transaction.docChanged) {
        view.dispatch(transaction.scrollIntoView());
      }
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
