import './editorToolbar.css';

import type { EditorMode } from '../editorMode';
import {
  createEditorModeControl,
  type EditorModeControl,
} from './createEditorModeControl';
import {
  createTableSizePicker,
  type TableSizePicker,
} from './createTableSizePicker';

export type EditorToolbarAction =
  | 'attach'
  | 'badge'
  | 'blockquote'
  | 'bullet-list'
  | 'code-block'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'ordered-list'
  | 'paragraph'
  | 'table'
  | 'task-list';

export interface EditorToolbarActionOptions {
  image?: {
    alt: string;
    linkUrl?: string;
    src: string;
  };
  tableSize?: {
    col: number;
    row: number;
  };
}

interface ToolbarButtonDefinition {
  action: EditorToolbarAction;
  label: string;
  text: string;
}

export interface EditorToolbar {
  buttons: ReadonlyMap<EditorToolbarAction, HTMLButtonElement>;
  destroy: () => void;
  element: HTMLElement;
  modeControl: EditorModeControl;
}

const toolbarButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'paragraph', label: 'Paragraph', text: '¶' },
  { action: 'heading-1', label: 'Heading 1', text: 'H1' },
  { action: 'heading-2', label: 'Heading 2', text: 'H2' },
  { action: 'heading-3', label: 'Heading 3', text: 'H3' },
  { action: 'bullet-list', label: 'Bulleted List', text: '• List' },
  { action: 'ordered-list', label: 'Numbered List', text: '1. List' },
  { action: 'task-list', label: 'Task List', text: 'Task' },
  { action: 'blockquote', label: 'Blockquote', text: 'Quote' },
  { action: 'code-block', label: 'Code Block', text: '</>' },
  { action: 'table', label: 'Insert Table', text: 'Table' },
  { action: 'badge', label: 'Insert Badge', text: 'Badge' },
  { action: 'attach', label: 'Attach file', text: 'Attach' },
];

const createToolbarButton = (
  definition: ToolbarButtonDefinition,
  runAction: (action: EditorToolbarAction, focusPopup: boolean) => void,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.className = 'editor-toolbar__button';
  button.type = 'button';
  button.disabled = true;
  button.title = definition.label;
  button.dataset.action = definition.action;
  button.setAttribute('aria-label', definition.label);
  button.textContent = definition.text;
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    runAction(definition.action, false);
  });
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) {
      return;
    }

    event.preventDefault();
    runAction(definition.action, true);
  });

  return button;
};

export const createEditorToolbar = (
  runAction: (
    action: EditorToolbarAction,
    options?: EditorToolbarActionOptions,
  ) => void,
  selectMode: (mode: EditorMode) => void,
): EditorToolbar => {
  const toolbar = document.createElement('div');
  const spacer = document.createElement('div');
  const buttons = new Map<EditorToolbarAction, HTMLButtonElement>();
  const modeControl = createEditorModeControl({ selectMode });
  let tableSizePicker: TableSizePicker | undefined;
  toolbar.className = 'editor-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Markdown Editor Toolbar');
  toolbar.setAttribute('aria-orientation', 'horizontal');

  for (const definition of toolbarButtons) {
    const button = createToolbarButton(
      definition,
      (action, focusPopup) => {
        if (action === 'table') {
          tableSizePicker?.toggle(focusPopup);
          return;
        }

        tableSizePicker?.close();
        runAction(action);
      },
    );
    buttons.set(definition.action, button);
    toolbar.append(button);
  }

  spacer.className = 'editor-toolbar__spacer';
  spacer.setAttribute('aria-hidden', 'true');
  toolbar.append(spacer, modeControl.element);

  const tableButton = buttons.get('table');

  if (tableButton !== undefined) {
    tableSizePicker = createTableSizePicker(tableButton, (tableSize) => {
      runAction('table', { tableSize });
    });
  }

  return {
    buttons,
    destroy: () => {
      tableSizePicker?.destroy();
      modeControl.destroy();
      toolbar.replaceChildren();
    },
    element: toolbar,
    modeControl,
  };
};
