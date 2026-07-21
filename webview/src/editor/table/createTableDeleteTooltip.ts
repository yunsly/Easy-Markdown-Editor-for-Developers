import type { Ctx } from '@milkdown/kit/ctx';
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
import { tableSchema } from '@milkdown/kit/preset/gfm';

import { getActiveTableContext } from './tableContext';
import './tableDeleteTooltip.css';

interface TableDeleteTooltipOptions {
  canShow: () => boolean;
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

const createTooltipContent = (
  deleteActiveTable: () => void,
): { button: HTMLButtonElement; element: HTMLElement } => {
  const tooltip = document.createElement('div');
  const button = document.createElement('button');
  tooltip.className = 'table-delete-tooltip';
  tooltip.setAttribute('role', 'toolbar');
  tooltip.setAttribute('aria-label', 'Table actions');
  tooltip.setAttribute('aria-keyshortcuts', 'Alt+Shift+F10');
  button.className = 'table-delete-tooltip__button';
  button.type = 'button';
  button.title = 'Delete table';
  button.setAttribute('aria-label', 'Delete table');
  button.textContent = 'Delete Table';
  button.addEventListener('pointerdown', (event) => {
    if (event.button === 0) {
      event.preventDefault();
    }
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    deleteActiveTable();
  });
  tooltip.append(button);

  return { button, element: tooltip };
};

class TableDeleteTooltipView implements PluginView {
  readonly #button: HTMLButtonElement;
  readonly #canShow: () => boolean;
  readonly #content: HTMLElement;
  readonly #context: Ctx;
  readonly #dialogObserver: MutationObserver;
  readonly #provider: TooltipProvider;
  readonly #view: EditorView;

  constructor(
    context: Ctx,
    view: EditorView,
    options: TableDeleteTooltipOptions,
  ) {
    this.#context = context;
    this.#view = view;
    this.#canShow = options.canShow;
    const content = createTooltipContent(this.#deleteActiveTable);
    this.#button = content.button;
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
    deleteActiveTable(state, this.#view.dispatch, tableType);

    this.#provider.hide();
    this.#view.focus();
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
    this.#button.focus({ preventScroll: true });
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
