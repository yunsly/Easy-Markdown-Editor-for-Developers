import { toggleLinkCommand } from '@milkdown/kit/component/link-tooltip';
import type { Ctx } from '@milkdown/kit/ctx';
import type { Editor } from '@milkdown/kit/core';
import {
  commandsCtx,
  editorCtx,
  EditorStatus,
} from '@milkdown/kit/core';
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
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
} from '@milkdown/kit/preset/commonmark';
import {
  strikethroughSchema,
  toggleStrikethroughCommand,
} from '@milkdown/kit/preset/gfm';

import './floatingToolbar.css';

const isMacOS = navigator.userAgent.includes('Macintosh');

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

const toolbarButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'bold', label: '굵게', text: 'B' },
  { action: 'italic', label: '기울임', text: 'I' },
  { action: 'strikethrough', label: '취소선', text: 'S' },
  { action: 'inlineCode', label: '인라인 코드', text: '</>' },
  { action: 'link', label: '링크', text: 'Link' },
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
  toolbar.setAttribute('aria-label', '텍스트 서식');
  toolbar.setAttribute('aria-orientation', 'horizontal');

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
      });
    }

    toolbar.append(button);
  }

  return { buttons, element: toolbar };
};

const isActionActive = (
  context: Ctx,
  action: ToolbarAction,
): boolean => {
  if (context.get(editorCtx).status !== EditorStatus.Created) {
    return false;
  }

  const commands = context.get(commandsCtx);

  if (action === 'bold') {
    return commands.call(
      isMarkSelectedCommand.key,
      strongSchema.type(context),
    );
  }

  if (action === 'italic') {
    return commands.call(
      isMarkSelectedCommand.key,
      emphasisSchema.type(context),
    );
  }

  if (action === 'strikethrough') {
    return commands.call(
      isMarkSelectedCommand.key,
      strikethroughSchema.type(context),
    );
  }

  if (action === 'inlineCode') {
    return commands.call(
      isMarkSelectedCommand.key,
      inlineCodeSchema.type(context),
    );
  }

  return commands.call(
    isMarkSelectedCommand.key,
    linkSchema.type(context),
  );
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
        context.get(commandsCtx).call(toggleStrongCommand.key);
      } else if (action === 'italic') {
        context.get(commandsCtx).call(toggleEmphasisCommand.key);
      } else if (action === 'strikethrough') {
        context.get(commandsCtx).call(toggleStrikethroughCommand.key);
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
    view.dom.ownerDocument.addEventListener(
      'keydown',
      this.#handleEditorKeydown,
      true,
    );
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

  readonly #handleEditorKeydown = (event: KeyboardEvent): void => {
    const { doc, selection } = this.#view.state;
    const eventTarget = event.target;
    const isEditorTarget =
      eventTarget instanceof Node &&
      this.#view.dom.contains(eventTarget);

    if (
      event.key !== 'Tab' ||
      event.altKey ||
      (event.ctrlKey && !isMacOS) ||
      event.metaKey ||
      !isEditorTarget ||
      !(selection instanceof TextSelection) ||
      selection.empty ||
      doc.textBetween(selection.from, selection.to).length === 0
    ) {
      return;
    }

    const enabledButtons = [...this.#buttons.values()].filter(
      (button) => !button.disabled,
    );
    const target = event.shiftKey
      ? enabledButtons.at(-1)
      : enabledButtons.at(0);

    if (target === undefined) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    target.focus({ preventScroll: true });
  };

  readonly #handleToolbarKeydown = (event: KeyboardEvent): void => {
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
      const isActive = isActionActive(this.#context, action);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));

      if (action === 'inlineCode') {
        button.disabled = !view.state.selection.$from.sameParent(
          view.state.selection.$to,
        );
      }
    }
  }

  destroy(): void {
    this.#view.dom.removeEventListener('blur', this.#handleEditorBlur, true);
    this.#view.dom.ownerDocument.removeEventListener(
      'keydown',
      this.#handleEditorKeydown,
      true,
    );
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
      context.set(floatingToolbarTooltip.key, {
        view: (view) => new FloatingToolbarView(context, view),
      });
    })
    .use(floatingToolbarTooltip);
};
