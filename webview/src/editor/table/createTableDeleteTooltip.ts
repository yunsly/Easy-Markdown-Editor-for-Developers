import type { Ctx } from '@milkdown/kit/ctx';
import { commandsCtx } from '@milkdown/kit/core';
import type { Editor } from '@milkdown/kit/core';
import type { NodeType } from '@milkdown/kit/prose/model';
import type {
  EditorState,
  PluginView,
  Transaction,
} from '@milkdown/kit/prose/state';
import { NodeSelection } from '@milkdown/kit/prose/state';
import { deleteTable, isInTable } from '@milkdown/kit/prose/tables';
import type { EditorView } from '@milkdown/kit/prose/view';
import {
  TooltipProvider,
  tooltipFactory,
} from '@milkdown/kit/plugin/tooltip';
import {
  selectColCommand,
  setAlignCommand,
  tableSchema,
} from '@milkdown/kit/preset/gfm';

import {
  getActiveTableColumnContext,
  getActiveTableContext,
  type TableColumnAlignment,
} from './tableContext';
import './tableDeleteTooltip.css';

interface TableDeleteTooltipOptions {
  canShow: () => boolean;
  onDocumentChange: () => void;
}

const tableDeleteTooltip = tooltipFactory(
  'VISUAL_MARKDOWN_EDITOR_TABLE_DELETE',
);

export const deleteActiveTable = (
  state: EditorState,
  dispatch: (transaction: Transaction) => void,
  tableType: NodeType,
): boolean => {
  if (getActiveTableContext(state.selection, tableType) === undefined) {
    return false;
  }

  if (isInTable(state)) {
    return deleteTable(state, dispatch);
  }

  if (
    state.selection instanceof NodeSelection &&
    state.selection.node.type === tableType
  ) {
    dispatch(state.tr.deleteSelection().scrollIntoView());
    return true;
  }

  return false;
};

export const alignActiveTableColumn = (
  context: Ctx,
  view: EditorView,
  alignment: TableColumnAlignment,
  onDocumentChange: () => void,
): boolean => {
  const { state } = view;
  const column = getActiveTableColumnContext(
    state.selection,
    tableSchema.type(context),
  );

  if (column === undefined || column.alignment === alignment) {
    return false;
  }

  const bookmark = state.selection.getBookmark();
  const commands = context.get(commandsCtx);
  onDocumentChange();
  commands.call(selectColCommand.key, {
    index: column.columnIndex,
    pos: column.from + 1,
  });
  commands.call(setAlignCommand.key, alignment);

  const nextState = view.state;
  view.dispatch(
    nextState.tr
      .setSelection(bookmark.resolve(nextState.doc))
      .setMeta('addToHistory', false),
  );
  view.focus();

  return true;
};

const createTooltipContent = (
  alignActiveColumn: (alignment: TableColumnAlignment) => void,
  deleteActiveTable: () => void,
): {
  alignmentButtons: ReadonlyMap<TableColumnAlignment, HTMLButtonElement>;
  deleteButton: HTMLButtonElement;
  element: HTMLElement;
} => {
  const tooltip = document.createElement('div');
  const alignmentButtons = new Map<
    TableColumnAlignment,
    HTMLButtonElement
  >();
  const separator = document.createElement('span');
  const deleteButton = document.createElement('button');
  tooltip.className = 'table-delete-tooltip';
  tooltip.setAttribute('role', 'toolbar');
  tooltip.setAttribute('aria-label', 'Table actions');
  tooltip.setAttribute('aria-keyshortcuts', 'Alt+Shift+F10');

  for (const [alignment, label, text] of [
    ['left', 'Align column left', '≡←'],
    ['center', 'Align column center', '≡↔'],
    ['right', 'Align column right', '→≡'],
  ] as const) {
    const button = document.createElement('button');
    button.className =
      'table-delete-tooltip__button table-delete-tooltip__alignment';
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', 'false');
    button.textContent = text;
    button.addEventListener('pointerdown', (event) => {
      if (event.button === 0) {
        event.preventDefault();
      }
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      alignActiveColumn(alignment);
    });
    alignmentButtons.set(alignment, button);
    tooltip.append(button);
  }

  separator.className = 'table-delete-tooltip__separator';
  separator.setAttribute('role', 'separator');
  separator.setAttribute('aria-orientation', 'vertical');
  deleteButton.className =
    'table-delete-tooltip__button table-delete-tooltip__delete';
  deleteButton.type = 'button';
  deleteButton.title = 'Delete table';
  deleteButton.setAttribute('aria-label', 'Delete table');
  deleteButton.textContent = 'Delete Table';
  deleteButton.addEventListener('pointerdown', (event) => {
    if (event.button === 0) {
      event.preventDefault();
    }
  });
  deleteButton.addEventListener('click', (event) => {
    event.preventDefault();
    deleteActiveTable();
  });
  tooltip.append(separator, deleteButton);

  return { alignmentButtons, deleteButton, element: tooltip };
};

class TableDeleteTooltipView implements PluginView {
  readonly #alignmentButtons: ReadonlyMap<
    TableColumnAlignment,
    HTMLButtonElement
  >;
  readonly #canShow: () => boolean;
  readonly #content: HTMLElement;
  readonly #context: Ctx;
  readonly #deleteButton: HTMLButtonElement;
  readonly #dialogObserver: MutationObserver;
  readonly #provider: TooltipProvider;
  readonly #view: EditorView;
  readonly #onDocumentChange: () => void;

  constructor(
    context: Ctx,
    view: EditorView,
    options: TableDeleteTooltipOptions,
  ) {
    this.#context = context;
    this.#view = view;
    this.#canShow = options.canShow;
    this.#onDocumentChange = options.onDocumentChange;
    const content = createTooltipContent(
      this.#alignActiveColumn,
      this.#deleteActiveTable,
    );
    this.#alignmentButtons = content.alignmentButtons;
    this.#deleteButton = content.deleteButton;
    this.#content = content.element;
    this.#provider = new TooltipProvider({
      content: this.#content,
      debounce: 20,
      offset: 8,
      shift: { padding: 8 },
      floatingUIOptions: { placement: 'top-end' },
    });
    (view.dom.parentElement ?? document.body).append(this.#content);
    this.#dialogObserver = new MutationObserver(() => {
      this.#syncVisibility();
    });
    this.#dialogObserver.observe(document.body, {
      attributeFilter: ['hidden', 'open'],
      attributes: true,
      subtree: true,
    });
    view.dom.addEventListener('focus', this.#handleEditorFocus, true);
    view.dom.addEventListener('blur', this.#handleEditorBlur, true);
    this.#content.addEventListener('keydown', this.#handleTooltipKeydown);
    this.update(view);
  }

  readonly #deleteActiveTable = (): void => {
    const { state } = this.#view;
    const tableType = tableSchema.type(this.#context);
    this.#onDocumentChange();
    deleteActiveTable(state, this.#view.dispatch, tableType);

    this.#provider.hide();
    this.#view.focus();
  };

  readonly #alignActiveColumn = (
    alignment: TableColumnAlignment,
  ): void => {
    if (!alignActiveTableColumn(
      this.#context,
      this.#view,
      alignment,
      this.#onDocumentChange,
    )) {
      this.#view.focus();
      return;
    }

    this.#syncVisibility();
  };

  readonly #handleEditorFocus = (): void => {
    this.#syncVisibility();
  };

  readonly #handleEditorBlur = (): void => {
    queueMicrotask(() => {
      this.#syncVisibility();
    });
  };

  readonly #handleTooltipKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.#provider.hide();
    this.#view.focus();
  };

  #getTableElement(from: number): HTMLElement | undefined {
    const node = this.#view.nodeDOM(from);

    if (node instanceof HTMLElement) {
      return node;
    }

    const nearbyNode = this.#view.domAtPos(from + 1).node;
    const nearbyElement = nearbyNode instanceof HTMLElement
      ? nearbyNode
      : nearbyNode.parentElement;

    return nearbyElement?.closest<HTMLElement>(
      '.milkdown-table-block, table',
    ) ?? undefined;
  }

  #hasBlockingPopover(): boolean {
    return document.querySelector(
      'dialog[open], .editor-table-size-picker:not([hidden]), '
        + '.editor-heading-menu:not([hidden]), '
        + '.milkdown-link-edit[data-show="true"]',
    ) !== null;
  }

  #syncVisibility(): void {
    const { state } = this.#view;
    const activeElement = (
      this.#view.dom.getRootNode() as Document | ShadowRoot
    ).activeElement;
    const tooltipHasFocus = this.#content.contains(activeElement);
    const table = getActiveTableContext(
      state.selection,
      tableSchema.type(this.#context),
    );

    if (
      !this.#canShow() ||
      !this.#view.editable ||
      (!this.#view.hasFocus() && !tooltipHasFocus) ||
      this.#hasBlockingPopover() ||
      table === undefined
    ) {
      this.#provider.hide();
      return;
    }

    const column = getActiveTableColumnContext(
      state.selection,
      tableSchema.type(this.#context),
    );

    for (const [alignment, button] of this.#alignmentButtons) {
      const isActive = column?.alignment === alignment;
      button.disabled = column === undefined;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }

    const tableElement = this.#getTableElement(table.from);

    if (tableElement === undefined || !tableElement.isConnected) {
      this.#provider.hide();
      return;
    }

    this.#provider.show(
      {
        contextElement: this.#view.dom,
        getBoundingClientRect: () => tableElement.getBoundingClientRect(),
      },
      this.#view,
    );
  }

  handleEditorKeydown(event: KeyboardEvent): boolean {
    const isTooltipShortcut =
      event.key === 'F10' &&
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.shiftKey;

    if (!isTooltipShortcut || this.#content.dataset.show !== 'true') {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    const firstEnabledButton = this.#content.querySelector<HTMLButtonElement>(
      'button:not(:disabled)',
    );
    (firstEnabledButton ?? this.#deleteButton).focus({ preventScroll: true });
    return true;
  }

  update(view: EditorView, _previousState?: EditorState): void {
    if (view === this.#view) {
      this.#syncVisibility();
    }
  }

  destroy(): void {
    this.#dialogObserver.disconnect();
    this.#view.dom.removeEventListener('focus', this.#handleEditorFocus, true);
    this.#view.dom.removeEventListener('blur', this.#handleEditorBlur, true);
    this.#content.removeEventListener('keydown', this.#handleTooltipKeydown);
    this.#provider.destroy();
    this.#content.remove();
  }
}

export const registerTableDeleteTooltip = (
  editor: Editor,
  options: TableDeleteTooltipOptions,
): void => {
  editor
    .config((context) => {
      let tooltipView: TableDeleteTooltipView | undefined;

      context.set(tableDeleteTooltip.key, {
        props: {
          handleDOMEvents: {
            keydown: (_view, event) =>
              tooltipView?.handleEditorKeydown(event) ?? false,
          },
        },
        view: (view) => {
          tooltipView = new TableDeleteTooltipView(context, view, options);
          return tooltipView;
        },
      });
    })
    .use(tableDeleteTooltip);
};
