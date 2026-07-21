import type {
  Node as ProseMirrorNode,
  NodeType,
  ResolvedPos,
} from '@milkdown/kit/prose/model';
import type { Selection } from '@milkdown/kit/prose/state';
import { NodeSelection } from '@milkdown/kit/prose/state';

export interface ActiveTableContext {
  from: number;
  node: ProseMirrorNode;
  to: number;
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
