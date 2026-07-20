import { toggleLinkCommand } from '@milkdown/kit/component/link-tooltip';
import type { Ctx } from '@milkdown/kit/ctx';
import type { Editor } from '@milkdown/kit/core';
import {
  commandsCtx,
  editorCtx,
  EditorStatus,
} from '@milkdown/kit/core';
import { toggleMark } from '@milkdown/kit/prose/commands';
import type { MarkType } from '@milkdown/kit/prose/model';
import type {
  EditorState,
  PluginView,
} from '@milkdown/kit/prose/state';
import { TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import {
  TooltipProvider,
  tooltipFactory,
} from '@milkdown/kit/plugin/tooltip';
import {
  emphasisSchema,
  inlineCodeSchema,
  isMarkSelectedCommand,
  linkSchema,
  strongSchema,
  toggleInlineCodeCommand,
} from '@milkdown/kit/preset/commonmark';
import { strikethroughSchema } from '@milkdown/kit/preset/gfm';

import './floatingToolbar.css';

interface ToolbarButtonDefinition {
  action?: ToolbarAction;
  label: string;
  text: string;
}

interface ToolbarContent {
  buttons: ReadonlyMap<ToolbarAction, HTMLButtonElement>;
  element: HTMLElement;
}

type ToolbarAction =
  | 'bold'
  | 'inlineCode'
  | 'italic'
  | 'link'
  | 'strikethrough';

type ToolbarActionState = 'active' | 'inactive' | 'mixed';

const toolbarButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'bold', label: 'Bold', text: 'B' },
  { action: 'italic', label: 'Italic', text: 'I' },
  { action: 'strikethrough', label: 'Strikethrough', text: 'S' },
  { action: 'inlineCode', label: 'Inline Code', text: '</>' },
  { action: 'link', label: 'Link', text: 'Link' },
];

const floatingToolbarTooltip = tooltipFactory(
  'VISUAL_MARKDOWN_EDITOR_FLOATING_TOOLBAR',
);

const createToolbarContent = (
  runAction: (action: ToolbarAction) => void,
): ToolbarContent => {
  const toolbar = document.createElement('div');
  const buttons = new Map<ToolbarAction, HTMLButtonElement>();
  toolbar.className = 'floating-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Text Formatting');
  toolbar.setAttribute('aria-orientation', 'horizontal');
  toolbar.setAttribute('aria-keyshortcuts', 'Alt+F10');

  for (const definition of toolbarButtons) {
    const button = document.createElement('button');
    button.className = 'floating-toolbar__button';
    button.type = 'button';
    button.disabled = definition.action === undefined;
    button.title = definition.label;
    button.setAttribute('aria-label', definition.label);
    button.textContent = definition.text;

    if (definition.action !== undefined) {
      const action = definition.action;
      button.setAttribute('aria-pressed', 'false');
      buttons.set(action, button);

      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        runAction(action);
      });
      button.addEventListener('click', (event) => {
        if (event.detail !== 0) {
          return;
        }

        event.preventDefault();
        runAction(action);

        if (action !== 'link') {
          button.focus({ preventScroll: true });
        }
      });
    }

    toolbar.append(button);
  }

  return { buttons, element: toolbar };
};

const getMarkSelectionState = (
  state: EditorState,
  markType: MarkType,
): ToolbarActionState => {
  const { doc, selection } = state;
  let hasMarkedText = false;
  let hasUnmarkedText = false;

  doc.nodesBetween(
    selection.from,
    selection.to,
    (node, position, parent) => {
      const text = node.text;

      if (
        !node.isText ||
        parent === null ||
        !parent.type.allowsMarkType(markType) ||
        typeof text !== 'string'
      ) {
        return;
      }

      const selectedFrom = Math.max(selection.from, position) - position;
      const selectedTo =
        Math.min(selection.to, position + node.nodeSize) - position;
      const selectedText = text.slice(selectedFrom, selectedTo);

      if (selectedText.trim().length === 0) {
        return;
      }

      if (markType.isInSet(node.marks)) {
        hasMarkedText = true;
      } else {
        hasUnmarkedText = true;
      }
    },
  );

  if (hasMarkedText && hasUnmarkedText) {
    return 'mixed';
  }

  return hasMarkedText ? 'active' : 'inactive';
};

const toggleMarkForSelection = (context: Ctx, markType: MarkType): void => {
  context.get(commandsCtx).inline(
    toggleMark(markType, null, { removeWhenPresent: false }),
  );
};

const getActionState = (
  context: Ctx,
  action: ToolbarAction,
  state: EditorState,
): ToolbarActionState => {
  if (context.get(editorCtx).status !== EditorStatus.Created) {
    return 'inactive';
  }

  if (action === 'bold') {
    return getMarkSelectionState(state, strongSchema.type(context));
  }

  if (action === 'italic') {
    return getMarkSelectionState(state, emphasisSchema.type(context));
  }

  if (action === 'strikethrough') {
    return getMarkSelectionState(
      state,
      strikethroughSchema.type(context),
    );
  }

  const commands = context.get(commandsCtx);

  if (action === 'inlineCode') {
    return commands.call(
      isMarkSelectedCommand.key,
      inlineCodeSchema.type(context),
    )
      ? 'active'
      : 'inactive';
  }

  return commands.call(
    isMarkSelectedCommand.key,
    linkSchema.type(context),
  )
    ? 'active'
    : 'inactive';
};

class FloatingToolbarView implements PluginView {
  readonly #buttons: ToolbarContent['buttons'];
  readonly #content: HTMLElement;
  readonly #context: Ctx;
  readonly #provider: TooltipProvider;
  readonly #view: EditorView;

  constructor(context: Ctx, view: EditorView) {
    this.#context = context;
    this.#view = view;
    const toolbarContent = createToolbarContent((action) => {
      if (action === 'bold') {
        toggleMarkForSelection(context, strongSchema.type(context));
      } else if (action === 'italic') {
        toggleMarkForSelection(context, emphasisSchema.type(context));
      } else if (action === 'strikethrough') {
        toggleMarkForSelection(
          context,
          strikethroughSchema.type(context),
        );
      } else if (
        action === 'inlineCode' &&
        view.state.selection.$from.sameParent(
          view.state.selection.$to,
        )
      ) {
        context.get(commandsCtx).call(toggleInlineCodeCommand.key);
      } else if (action === 'link') {
        context.get(commandsCtx).call(toggleLinkCommand.key);
      }

      if (action !== 'link') {
        view.focus();
      }
    });
    this.#buttons = toolbarContent.buttons;
    this.#content = toolbarContent.element;
    this.#provider = new TooltipProvider({
      content: this.#content,
      debounce: 20,
      offset: 8,
      shift: { padding: 8 },
      shouldShow: (currentView) => {
        const { doc, selection } = currentView.state;
        const activeElement = (
          currentView.dom.getRootNode() as Document | ShadowRoot
        ).activeElement;
        const toolbarHasFocus = this.#content.contains(activeElement);

        return (
          currentView.editable &&
          selection instanceof TextSelection &&
          !selection.empty &&
          doc.textBetween(selection.from, selection.to).length > 0 &&
          (currentView.hasFocus() || toolbarHasFocus)
        );
      },
    });

    view.dom.addEventListener('blur', this.#handleEditorBlur, true);
    this.#content.addEventListener(
      'keydown',
      this.#handleToolbarKeydown,
    );
    this.update(view);
  }

  readonly #handleEditorBlur = (): void => {
    queueMicrotask(() => {
      const activeElement = (
        this.#view.dom.getRootNode() as Document | ShadowRoot
      ).activeElement;

      if (!this.#content.contains(activeElement)) {
        this.#provider.hide();
      }
    });
  };

  handleEditorKeydown(view: EditorView, event: KeyboardEvent): boolean {
    const { doc, selection } = view.state;
    const isTabEntry =
      event.key === 'Tab' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey;
    const isToolbarShortcut =
      event.key === 'F10' &&
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey;

    if (
      (!isTabEntry && !isToolbarShortcut) ||
      this.#content.dataset.show !== 'true' ||
      !(selection instanceof TextSelection) ||
      selection.empty ||
      doc.textBetween(selection.from, selection.to).length === 0
    ) {
      return false;
    }

    const enabledButtons = [...this.#buttons.values()].filter(
      (button) => !button.disabled,
    );
    const target = isTabEntry && event.shiftKey
      ? enabledButtons.at(-1)
      : enabledButtons.at(0);

    if (target === undefined) {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    target.focus({ preventScroll: true });
    return true;
  }

  readonly #handleToolbarKeydown = (event: KeyboardEvent): void => {
    const isTabNavigation =
      event.key === 'Tab' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey;

    if (isTabNavigation) {
      const enabledButtons = [...this.#buttons.values()].filter(
        (button) => !button.disabled,
      );
      const currentIndex = enabledButtons.findIndex(
        (button) => button === event.target,
      );
      const isForwardBoundary =
        currentIndex >= 0 &&
        !event.shiftKey &&
        currentIndex === enabledButtons.length - 1;
      const isBackwardBoundary = event.shiftKey && currentIndex === 0;

      if (isForwardBoundary || isBackwardBoundary) {
        const target = event.shiftKey
          ? enabledButtons.at(-1)
          : enabledButtons.at(0);

        if (target !== undefined) {
          event.preventDefault();
          event.stopImmediatePropagation();
          target.focus({ preventScroll: true });
          return;
        }
      }
    }

    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.#provider.hide();
    this.#view.focus();
  };

  update(view: EditorView, previousState?: EditorState): void {
    this.#provider.update(view, previousState);

    for (const [action, button] of this.#buttons) {
      const actionState = getActionState(
        this.#context,
        action,
        view.state,
      );
      const isActive = actionState === 'active';
      button.classList.toggle('is-active', isActive);
      button.setAttribute(
        'aria-pressed',
        actionState === 'mixed' ? 'mixed' : String(isActive),
      );

      if (action === 'inlineCode') {
        button.disabled = !view.state.selection.$from.sameParent(
          view.state.selection.$to,
        );
      }
    }
  }

  destroy(): void {
    this.#view.dom.removeEventListener('blur', this.#handleEditorBlur, true);
    this.#content.removeEventListener(
      'keydown',
      this.#handleToolbarKeydown,
    );
    this.#provider.destroy();
    this.#content.remove();
  }
}

export const registerFloatingToolbar = (editor: Editor): void => {
  editor
    .config((context) => {
      let toolbarView: FloatingToolbarView | undefined;

      context.set(floatingToolbarTooltip.key, {
        props: {
          handleDOMEvents: {
            keydown: (view, event) =>
              toolbarView?.handleEditorKeydown(view, event) ?? false,
          },
        },
        view: (view) => {
          toolbarView = new FloatingToolbarView(context, view);
          return toolbarView;
        },
      });
    })
    .use(floatingToolbarTooltip);
};
