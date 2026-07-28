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
  | 'align-center'
  | 'align-left'
  | 'align-right'
  | 'attach'
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
  alignmentMenu: TextAlignmentMenu;
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

export type ParagraphAlignment = 'center' | 'left' | 'right';

export interface TextAlignmentMenu {
  button: HTMLButtonElement;
  close: () => void;
  destroy: () => void;
  setActiveAlignment: (alignment: ParagraphAlignment | undefined) => void;
}

interface ToolbarRadioMenu {
  button: HTMLButtonElement;
  close: () => void;
  destroy: () => void;
  itemButtons: ReadonlyMap<EditorToolbarAction, HTMLButtonElement>;
}

interface ToolbarRadioMenuOptions {
  buttonLabel: string;
  buttonText: string;
  definitions: readonly ToolbarButtonDefinition[];
  menuId: string;
  menuLabel: string;
  onBeforeOpen: () => void;
  runAction: (action: EditorToolbarAction) => void;
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

const extendedHeadingButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'heading-4', label: 'Heading 4', text: 'H4' },
  { action: 'heading-5', label: 'Heading 5', text: 'H5' },
  { action: 'heading-6', label: 'Heading 6', text: 'H6' },
];

const alignmentButtons: readonly ToolbarButtonDefinition[] = [
  { action: 'align-left', label: 'Align Left', text: 'Left' },
  { action: 'align-center', label: 'Align Center', text: 'Center' },
  { action: 'align-right', label: 'Align Right', text: 'Right' },
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

const createToolbarRadioMenu = ({
  buttonLabel,
  buttonText,
  definitions,
  menuId,
  menuLabel,
  onBeforeOpen,
  runAction,
}: ToolbarRadioMenuOptions): ToolbarRadioMenu => {
  const button = document.createElement('button');
  const menu = document.createElement('div');
  const itemButtons = new Map<EditorToolbarAction, HTMLButtonElement>();
  const viewportPadding = 8;
  button.className = 'editor-toolbar__button';
  button.type = 'button';
  button.disabled = true;
  button.title = buttonLabel;
  button.textContent = buttonText;
  button.setAttribute('aria-label', buttonLabel);
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-controls', menuId);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-pressed', 'false');
  menu.id = menuId;
  menu.className = 'editor-toolbar-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', menuLabel);

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

  for (const definition of definitions) {
    const item = createToolbarButton(definition, (action) => {
      close();
      runAction(action);
    });
    item.classList.add('editor-toolbar-menu__item');
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

    onBeforeOpen();
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
  };
};

const createExtendedHeadingMenu = (
  runAction: (action: EditorToolbarAction) => void,
  onBeforeOpen: () => void,
): ExtendedHeadingMenu & ToolbarRadioMenu => {
  const menu = createToolbarRadioMenu({
    buttonLabel: 'More headings',
    buttonText: 'H4–H6 ▾',
    definitions: extendedHeadingButtons,
    menuId: 'editor-heading-menu',
    menuLabel: 'More headings',
    onBeforeOpen,
    runAction,
  });

  return {
    ...menu,
    setActiveLevel: (level) => {
      const isActive = level !== undefined;
      const label = isActive ? `Heading ${level}` : 'More headings';
      menu.button.classList.toggle('is-active', isActive);
      menu.button.setAttribute('aria-pressed', String(isActive));
      menu.button.setAttribute('aria-label', label);
      menu.button.title = label;
      menu.button.textContent = isActive ? `H${level} ▾` : 'H4–H6 ▾';
    },
  };
};

const createTextAlignmentMenu = (
  runAction: (action: EditorToolbarAction) => void,
  onBeforeOpen: () => void,
): TextAlignmentMenu & ToolbarRadioMenu => {
  const menu = createToolbarRadioMenu({
    buttonLabel: 'Text alignment',
    buttonText: 'Align ▾',
    definitions: alignmentButtons,
    menuId: 'editor-alignment-menu',
    menuLabel: 'Text alignment',
    onBeforeOpen,
    runAction,
  });

  return {
    ...menu,
    setActiveAlignment: (alignment) => {
      const activeLabel = alignment === undefined
        ? 'Text alignment'
        : `Text alignment: ${alignment}`;
      const isActive = alignment === 'center' || alignment === 'right';
      menu.button.classList.toggle('is-active', isActive);
      menu.button.setAttribute('aria-pressed', String(isActive));
      menu.button.setAttribute('aria-label', activeLabel);
      menu.button.title = activeLabel;
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
    alignmentMenu.close();
    tableSizePicker?.close();
    runAction(action);
  }, () => {
    alignmentMenu.close();
    tableSizePicker?.close();
  });
  const alignmentMenu = createTextAlignmentMenu((action) => {
    headingMenu.close();
    tableSizePicker?.close();
    runAction(action);
  }, () => {
    headingMenu.close();
    tableSizePicker?.close();
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
          headingMenu.close();
          alignmentMenu.close();
          tableSizePicker?.toggle(focusPopup);
          return;
        }

        headingMenu.close();
        alignmentMenu.close();
        tableSizePicker?.close();
        runAction(action);
      },
    );
    buttons.set(definition.action, button);
    toolbar.append(button);

    if (definition.action === 'heading-3') {
      toolbar.append(headingMenu.button, alignmentMenu.button);
    }
  }

  for (const [action, button] of headingMenu.itemButtons) {
    buttons.set(action, button);
  }
  for (const [action, button] of alignmentMenu.itemButtons) {
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
    alignmentMenu,
    buttons,
    destroy: () => {
      alignmentMenu.destroy();
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
