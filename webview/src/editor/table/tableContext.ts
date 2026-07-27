import type {
  Node as ProseMirrorNode,
  NodeType,
  ResolvedPos,
} from '@milkdown/kit/prose/model';
import type { Selection } from '@milkdown/kit/prose/state';
import { NodeSelection } from '@milkdown/kit/prose/state';
import {
  cellAround,
  CellSelection,
  TableMap,
} from '@milkdown/kit/prose/tables';

export interface ActiveTableContext {
  from: number;
  node: ProseMirrorNode;
  to: number;
}

export type TableColumnAlignment = 'center' | 'left' | 'right';

export interface ActiveTableColumnContext extends ActiveTableContext {
  alignment: TableColumnAlignment | undefined;
  columnIndex: number;
}

const findTableAtPosition = (
  position: ResolvedPos,
  tableType: NodeType,
): ActiveTableContext | undefined => {
  for (let depth = position.depth; depth > 0; depth -= 1) {
    const node = position.node(depth);

    if (node.type === tableType) {
      const from = position.before(depth);
      return { from, node, to: from + node.nodeSize };
    }
  }

  return undefined;
};

export const getActiveTableContext = (
  selection: Selection,
  tableType: NodeType,
): ActiveTableContext | undefined => {
  if (
    selection instanceof NodeSelection &&
    selection.node.type === tableType
  ) {
    return {
      from: selection.from,
      node: selection.node,
      to: selection.to,
    };
  }

  let activeTable: ActiveTableContext | undefined;

  for (const range of selection.ranges) {
    for (const position of [range.$from, range.$to]) {
      const table = findTableAtPosition(position, tableType);

      if (table === undefined) {
        return undefined;
      }

      if (
        activeTable !== undefined &&
        (table.from !== activeTable.from || table.to !== activeTable.to)
      ) {
        return undefined;
      }

      activeTable = table;
    }
  }

  return activeTable;
};

const normalizeAlignment = (value: unknown): TableColumnAlignment => {
  if (value === 'center' || value === 'right') {
    return value;
  }

  return 'left';
};

export const getActiveTableColumnContext = (
  selection: Selection,
  tableType: NodeType,
): ActiveTableColumnContext | undefined => {
  const table = getActiveTableContext(selection, tableType);

  if (table === undefined || selection instanceof NodeSelection) {
    return undefined;
  }

  const $cell = selection instanceof CellSelection
    ? selection.$headCell
    : cellAround(selection.$head);

  if ($cell === null) {
    return undefined;
  }

  const map = TableMap.get(table.node);
  const cellPosition = $cell.pos - table.from - 1;
  let columnIndex: number;

  try {
    columnIndex = map.findCell(cellPosition).left;
  } catch {
    return undefined;
  }

  const cellPositions = map.cellsInRect({
    bottom: map.height,
    left: columnIndex,
    right: columnIndex + 1,
    top: 0,
  });
  let alignment: TableColumnAlignment | undefined;

  for (const position of cellPositions) {
    const cell = table.node.nodeAt(position);

    if (cell === null) {
      return undefined;
    }

    const cellAlignment = normalizeAlignment(cell.attrs.alignment);

    if (alignment !== undefined && alignment !== cellAlignment) {
      alignment = undefined;
      break;
    }

    alignment = cellAlignment;
  }

  return {
    ...table,
    alignment,
    columnIndex,
  };
};
