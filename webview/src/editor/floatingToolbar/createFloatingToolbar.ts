import type { Editor } from '@milkdown/kit/core';
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

import './floatingToolbar.css';

interface ToolbarButtonDefinition {
  label: string;
  text: string;
}

const toolbarButtons: readonly ToolbarButtonDefinition[] = [
  { label: '굵게', text: 'B' },
  { label: '기울임', text: 'I' },
  { label: '취소선', text: 'S' },
  { label: '인라인 코드', text: '</>' },
  { label: '링크', text: 'Link' },
];

const floatingToolbarTooltip = tooltipFactory(
  'VISUAL_MARKDOWN_EDITOR_FLOATING_TOOLBAR',
);

const createToolbarContent = (): HTMLElement => {
  const toolbar = document.createElement('div');
  toolbar.className = 'floating-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '텍스트 서식');

  for (const definition of toolbarButtons) {
    const button = document.createElement('button');
    button.className = 'floating-toolbar__button';
    button.type = 'button';
    button.disabled = true;
    button.title = definition.label;
    button.setAttribute('aria-label', definition.label);
    button.textContent = definition.text;
    toolbar.append(button);
  }

  return toolbar;
};

class FloatingToolbarView implements PluginView {
  readonly #content: HTMLElement;
  readonly #provider: TooltipProvider;
  readonly #view: EditorView;

  constructor(view: EditorView) {
    this.#view = view;
    this.#content = createToolbarContent();
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

  update(view: EditorView, previousState?: EditorState): void {
    this.#provider.update(view, previousState);
  }

  destroy(): void {
    this.#view.dom.removeEventListener('blur', this.#handleEditorBlur, true);
    this.#provider.destroy();
    this.#content.remove();
  }
}

export const registerFloatingToolbar = (editor: Editor): void => {
  editor
    .config((context) => {
      context.set(floatingToolbarTooltip.key, {
        view: (view) => new FloatingToolbarView(view),
      });
    })
    .use(floatingToolbarTooltip);
};
