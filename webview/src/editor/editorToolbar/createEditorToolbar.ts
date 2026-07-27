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
  | 'align-center'
  | 'align-left'
  | 'align-right'
  | 'badge'
  | 'blockquote'
  | 'bullet-list'
  | 'code-block'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
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
  headingMenu: ExtendedHeadingMenu;
  modeControl: EditorModeControl;
}

export interface ExtendedHeadingMenu {
  button: HTMLButtonElement;
  close: () => void;
  destroy: () => void;
  setActiveLevel: (level: 4 | 5 | 6 | undefined) => void;
}

const toolbarButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'paragraph', label: 'Paragraph', text: '¶' },
  { action: 'heading-1', label: 'Heading 1', text: 'H1' },
  { action: 'heading-2', label: 'Heading 2', text: 'H2' },
  { action: 'heading-3', label: 'Heading 3', text: 'H3' },
  { action: 'align-left', label: 'Align Left', text: '≡←' },
  { action: 'align-center', label: 'Align Center', text: '≡↔' },
  { action: 'align-right', label: 'Align Right', text: '→≡' },
  { action: 'bullet-list', label: 'Bulleted List', text: '• List' },
  { action: 'ordered-list', label: 'Numbered List', text: '1. List' },
  { action: 'task-list', label: 'Task List', text: 'Task' },
  { action: 'blockquote', label: 'Blockquote', text: 'Quote' },
  { action: 'code-block', label: 'Code Block', text: '</>' },
  { action: 'table', label: 'Insert Table', text: 'Table' },
  { action: 'badge', label: 'Insert Badge', text: 'Badge' },
  { action: 'attach', label: 'Attach file', text: 'Attach' },
];

const extendedHeadingButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'heading-4', label: 'Heading 4', text: 'H4' },
  { action: 'heading-5', label: 'Heading 5', text: 'H5' },
  { action: 'heading-6', label: 'Heading 6', text: 'H6' },
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

const createExtendedHeadingMenu = (
  runAction: (action: EditorToolbarAction) => void,
): ExtendedHeadingMenu & {
  itemButtons: ReadonlyMap<EditorToolbarAction, HTMLButtonElement>;
} => {
  const button = document.createElement('button');
  const menu = document.createElement('div');
  const itemButtons = new Map<EditorToolbarAction, HTMLButtonElement>();
  const viewportPadding = 8;
  button.className = 'editor-toolbar__button';
  button.type = 'button';
  button.disabled = true;
  button.title = 'More headings';
  button.textContent = 'H4–H6 ▾';
  button.setAttribute('aria-label', 'More headings');
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-controls', 'editor-heading-menu');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-pressed', 'false');
  menu.id = 'editor-heading-menu';
  menu.className = 'editor-heading-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'More headings');

  const positionMenu = (): void => {
    if (menu.hidden) {
      return;
    }

    const anchorRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const maxLeft = window.innerWidth - menuRect.width - viewportPadding;
    const left = Math.max(
      viewportPadding,
      Math.min(anchorRect.left, maxLeft),
    );
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const top = spaceBelow >= menuRect.height + viewportPadding
      ? anchorRect.bottom + 4
      : Math.max(viewportPadding, anchorRect.top - menuRect.height - 4);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  const close = (): void => {
    if (menu.hidden) {
      return;
    }

    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  const focusItem = (index: number): void => {
    const items = [...itemButtons.values()].filter((item) => !item.disabled);

    if (items.length === 0) {
      return;
    }

    items[(index + items.length) % items.length]?.focus({
      preventScroll: true,
    });
  };

  for (const definition of extendedHeadingButtons) {
    const item = createToolbarButton(definition, (action) => {
      close();
      runAction(action);
    });
    item.classList.add('editor-heading-menu__item');
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute('aria-checked', 'false');
    item.addEventListener('keydown', (event) => {
      const items = [...itemButtons.values()];
      const currentIndex = items.indexOf(item);
      const nextIndex = event.key === 'ArrowUp'
        ? currentIndex - 1
        : event.key === 'ArrowDown'
          ? currentIndex + 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : undefined;

      if (nextIndex === undefined) {
        return;
      }

      event.preventDefault();
      focusItem(nextIndex);
    });
    itemButtons.set(definition.action, item);
    menu.append(item);
  }

  document.body.append(menu);

  const toggle = (focusMenu: boolean): void => {
    if (!menu.hidden) {
      close();
      return;
    }

    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    positionMenu();

    if (focusMenu) {
      focusItem(0);
    }
  };

  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    toggle(false);
  });
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) {
      return;
    }

    event.preventDefault();
    toggle(true);
  });

  const handleDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target;

    if (
      menu.hidden ||
      !(target instanceof Node) ||
      menu.contains(target) ||
      button.contains(target)
    ) {
      return;
    }

    close();
  };
  const handleDocumentKeydown = (event: KeyboardEvent): void => {
    if (menu.hidden || event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const menuHadFocus = menu.contains(document.activeElement);
    close();

    if (menuHadFocus) {
      button.focus({ preventScroll: true });
    }
  };
  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeydown, true);
  window.addEventListener('resize', positionMenu);
  window.addEventListener('scroll', positionMenu, true);

  return {
    button,
    close,
    destroy: () => {
      document.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown,
        true,
      );
      document.removeEventListener('keydown', handleDocumentKeydown, true);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
      menu.remove();
    },
    itemButtons,
    setActiveLevel: (level) => {
      const isActive = level !== undefined;
      const label = isActive ? `Heading ${level}` : 'More headings';
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
      button.setAttribute('aria-label', label);
      button.title = label;
      button.textContent = isActive ? `H${level} ▾` : 'H4–H6 ▾';
    },
  };
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
  const headingMenu = createExtendedHeadingMenu((action) => {
    tableSizePicker?.close();
    runAction(action);
  });
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

    if (definition.action === 'heading-3') {
      toolbar.append(headingMenu.button);
    }
  }

  for (const [action, button] of headingMenu.itemButtons) {
    buttons.set(action, button);
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
      headingMenu.destroy();
      tableSizePicker?.destroy();
      modeControl.destroy();
      toolbar.replaceChildren();
    },
    element: toolbar,
    headingMenu,
    modeControl,
  };
};
