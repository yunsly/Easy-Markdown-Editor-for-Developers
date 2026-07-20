import type { EditorToolbarActionOptions } from './createEditorToolbar';

type TableSize = NonNullable<EditorToolbarActionOptions['tableSize']>;

export interface TableSizePicker {
  close: () => void;
  destroy: () => void;
  toggle: (focusGrid: boolean) => void;
}

const GRID_SIZE = 6;
const DEFAULT_SIZE: TableSize = { col: 3, row: 3 };
const VIEWPORT_PADDING = 8;

export const createTableSizePicker = (
  anchor: HTMLButtonElement,
  selectSize: (size: TableSize) => void,
): TableSizePicker => {
  const picker = document.createElement('div');
  const status = document.createElement('div');
  const grid = document.createElement('div');
  const cells: HTMLButtonElement[] = [];
  picker.id = 'editor-table-size-picker';
  picker.className = 'editor-table-size-picker';
  picker.hidden = true;
  picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-label', 'Select Table Size');
  status.className = 'editor-table-size-picker__status';
  status.setAttribute('aria-live', 'polite');
  grid.className = 'editor-table-size-picker__grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Select Table Rows and Columns');
  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-controls', picker.id);
  anchor.setAttribute('aria-expanded', 'false');

  const updateSelection = ({ row, col }: TableSize): void => {
    status.textContent = `${row} × ${col} table (including header row)`;

    for (const cell of cells) {
      const cellRow = Number(cell.dataset.row);
      const cellCol = Number(cell.dataset.col);
      cell.classList.toggle(
        'is-selected',
        cellRow <= row && cellCol <= col,
      );
    }
  };

  const positionPicker = (): void => {
    if (picker.hidden) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    const maxLeft = window.innerWidth - pickerRect.width - VIEWPORT_PADDING;
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(anchorRect.left, maxLeft),
    );
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const top = spaceBelow >= pickerRect.height + VIEWPORT_PADDING
      ? anchorRect.bottom + 4
      : Math.max(VIEWPORT_PADDING, anchorRect.top - pickerRect.height - 4);
    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  };

  const close = (): void => {
    if (picker.hidden) {
      return;
    }

    picker.hidden = true;
    anchor.setAttribute('aria-expanded', 'false');
  };

  const focusCell = (row: number, col: number): void => {
    const index = (row - 1) * GRID_SIZE + col - 1;
    const target = cells[index];

    if (target === undefined) {
      return;
    }

    for (const cell of cells) {
      cell.tabIndex = cell === target ? 0 : -1;
    }

    updateSelection({ row, col });
    target.focus({ preventScroll: true });
  };

  for (let row = 1; row <= GRID_SIZE; row += 1) {
    for (let col = 1; col <= GRID_SIZE; col += 1) {
      const cell = document.createElement('button');
      cell.className = 'editor-table-size-picker__cell';
      cell.type = 'button';
      cell.tabIndex = -1;
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute(
        'aria-label',
        `Insert ${row} × ${col} table (including header row)`,
      );
      cell.addEventListener('mouseenter', () => {
        updateSelection({ row, col });
      });
      cell.addEventListener('focus', () => {
        updateSelection({ row, col });
      });
      cell.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
      cell.addEventListener('click', (event) => {
        event.preventDefault();
        close();
        selectSize({ row, col });
      });
      cell.addEventListener('keydown', (event) => {
        const nextRow = event.key === 'ArrowUp'
          ? row - 1
          : event.key === 'ArrowDown'
            ? row + 1
            : row;
        const nextCol = event.key === 'ArrowLeft'
          ? col - 1
          : event.key === 'ArrowRight'
            ? col + 1
            : col;

        if (nextRow === row && nextCol === col) {
          return;
        }

        event.preventDefault();
        focusCell(
          Math.min(GRID_SIZE, Math.max(1, nextRow)),
          Math.min(GRID_SIZE, Math.max(1, nextCol)),
        );
      });
      cells.push(cell);
      grid.append(cell);
    }
  }

  picker.append(status, grid);
  document.body.append(picker);

  const toggle = (focusGrid: boolean): void => {
    if (!picker.hidden) {
      close();
      return;
    }

    picker.hidden = false;
    anchor.setAttribute('aria-expanded', 'true');
    updateSelection(DEFAULT_SIZE);
    positionPicker();

    if (focusGrid) {
      focusCell(DEFAULT_SIZE.row, DEFAULT_SIZE.col);
    }
  };

  const handleDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target;

    if (
      picker.hidden ||
      !(target instanceof Node) ||
      picker.contains(target) ||
      anchor.contains(target)
    ) {
      return;
    }

    close();
  };

  const handleDocumentKeydown = (event: KeyboardEvent): void => {
    if (picker.hidden || event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const pickerHadFocus = picker.contains(document.activeElement);
    close();

    if (pickerHadFocus) {
      anchor.focus({ preventScroll: true });
    }
  };

  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeydown, true);
  window.addEventListener('resize', positionPicker);
  window.addEventListener('scroll', positionPicker, true);

  return {
    close,
    destroy: () => {
      document.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown,
        true,
      );
      document.removeEventListener('keydown', handleDocumentKeydown, true);
      window.removeEventListener('resize', positionPicker);
      window.removeEventListener('scroll', positionPicker, true);
      picker.remove();
    },
    toggle,
  };
};
