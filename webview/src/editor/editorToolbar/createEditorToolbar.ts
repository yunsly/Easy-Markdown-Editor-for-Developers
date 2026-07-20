import './editorToolbar.css';

import {
  createTableSizePicker,
  type TableSizePicker,
} from './createTableSizePicker';

export type EditorToolbarAction =
  | 'badge'
  | 'blockquote'
  | 'bullet-list'
  | 'code-block'
  | 'delete-table'
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
}

const toolbarButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'paragraph', label: '문단', text: '¶' },
  { action: 'heading-1', label: '제목 1', text: 'H1' },
  { action: 'heading-2', label: '제목 2', text: 'H2' },
  { action: 'heading-3', label: '제목 3', text: 'H3' },
  { action: 'bullet-list', label: '글머리 기호 목록', text: '• List' },
  { action: 'ordered-list', label: '번호 매기기 목록', text: '1. List' },
  { action: 'task-list', label: '체크리스트', text: 'Task' },
  { action: 'blockquote', label: '인용문', text: 'Quote' },
  { action: 'code-block', label: '코드 블록', text: '</>' },
  { action: 'table', label: '표 삽입', text: 'Table' },
  { action: 'delete-table', label: '표 삭제', text: 'Delete Table' },
  { action: 'badge', label: 'Insert Badge', text: 'Badge' },
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
): EditorToolbar => {
  const toolbar = document.createElement('div');
  const buttons = new Map<EditorToolbarAction, HTMLButtonElement>();
  let tableSizePicker: TableSizePicker | undefined;
  toolbar.className = 'editor-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '문서 편집');
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
      toolbar.replaceChildren();
    },
    element: toolbar,
  };
};
