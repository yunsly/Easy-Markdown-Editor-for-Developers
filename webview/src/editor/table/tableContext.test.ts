import { Schema } from '@milkdown/kit/prose/model';
import { history, redo, undo } from '@milkdown/kit/prose/history';
import {
  EditorState,
  NodeSelection,
  TextSelection,
} from '@milkdown/kit/prose/state';
import {
  CellSelection,
  TableMap,
  tableNodes,
} from '@milkdown/kit/prose/tables';
import { describe, expect, it } from 'vitest';

import { deleteActiveTable } from './createTableDeleteTooltip';
import {
  getActiveTableColumnContext,
  getActiveTableContext,
} from './tableContext';

const tableSpecs = tableNodes({
  cellAttributes: {
    alignment: { default: 'left' },
  },
  cellContent: 'paragraph+',
  tableGroup: 'block',
});
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
    ...tableSpecs,
  },
});

const paragraph = (text: string) =>
  schema.node(
    'paragraph',
    null,
    text.length > 0 ? schema.text(text) : undefined,
  );
const cell = (
  type: 'table_cell' | 'table_header',
  text: string,
  alignment: 'center' | 'left' | 'right' = 'left',
) => schema.node(type, { alignment }, paragraph(text));
const row = (cells: ReturnType<typeof cell>[]) =>
  schema.node('table_row', null, cells);
const table = schema.node('table', null, [
  row([cell('table_header', 'Header')]),
  row([cell('table_cell', 'Body')]),
]);
const documentNode = schema.node('doc', null, [
  paragraph('Before'),
  table,
  paragraph('After'),
]);
const tableFrom = documentNode.child(0).nodeSize;

const findTextPosition = (text: string): number => {
  let result: number | undefined;

  documentNode.descendants((node, position) => {
    if (node.isText && node.text === text) {
      result = position;
      return false;
    }

    return result === undefined;
  });

  if (result === undefined) {
    throw new Error(`Missing test text: ${text}`);
  }

  return result;
};

describe('getActiveTableContext', () => {
  it.each(['Header', 'Body'])('detects a cursor in the %s cell', (text) => {
    const position = findTextPosition(text) + 1;
    const selection = TextSelection.create(documentNode, position);

    expect(getActiveTableContext(selection, schema.nodes.table)).toEqual({
      from: tableFrom,
      node: table,
      to: tableFrom + table.nodeSize,
    });
  });

  it('detects a text selection inside a cell', () => {
    const from = findTextPosition('Body');
    const selection = TextSelection.create(documentNode, from, from + 4);

    expect(getActiveTableContext(selection, schema.nodes.table)?.from).toBe(
      tableFrom,
    );
  });

  it('detects a table node selection', () => {
    const selection = NodeSelection.create(documentNode, tableFrom);

    expect(getActiveTableContext(selection, schema.nodes.table)?.node).toBe(
      table,
    );
  });

  it('does not detect a selection outside a table', () => {
    const selection = TextSelection.create(
      documentNode,
      findTextPosition('Before') + 1,
    );

    expect(getActiveTableContext(selection, schema.nodes.table)).toBeUndefined();
  });

  it('does not retain a stale table after it is deleted', () => {
    const state = EditorState.create({
      doc: documentNode,
      selection: TextSelection.create(
        documentNode,
        findTextPosition('Body') + 1,
      ),
    });
    const nextState = state.apply(
      state.tr.delete(tableFrom, tableFrom + table.nodeSize),
    );

    expect(
      getActiveTableContext(nextState.selection, schema.nodes.table),
    ).toBeUndefined();
  });
});

describe('getActiveTableColumnContext', () => {
  const alignedTable = schema.node('table', null, [
    row([
      cell('table_header', 'Left header'),
      cell('table_header', 'Center header', 'center'),
      cell('table_header', 'Right header', 'right'),
    ]),
    row([
      cell('table_cell', '왼쪽'),
      cell('table_cell', '가운데', 'center'),
      cell('table_cell', '100', 'right'),
    ]),
  ]);
  const alignedDocument = schema.node('doc', null, [
    paragraph('Before'),
    alignedTable,
    paragraph('After'),
  ]);
  const alignedTableFrom = alignedDocument.child(0).nodeSize;
  const findAlignedTextPosition = (text: string): number => {
    let result: number | undefined;

    alignedDocument.descendants((node, position) => {
      if (node.isText && node.text === text) {
        result = position;
        return false;
      }

      return result === undefined;
    });

    if (result === undefined) {
      throw new Error(`Missing aligned table text: ${text}`);
    }

    return result;
  };

  it.each([
    ['Left header', 0, 'left'],
    ['가운데', 1, 'center'],
    ['100', 2, 'right'],
  ] as const)(
    'detects the column and %s alignment from a cursor',
    (text, columnIndex, alignment) => {
      const selection = TextSelection.create(
        alignedDocument,
        findAlignedTextPosition(text) + 1,
      );

      expect(
        getActiveTableColumnContext(selection, schema.nodes.table),
      ).toMatchObject({ alignment, columnIndex });
    },
  );

  it('uses the CellSelection head column for a multi-column selection', () => {
    const map = TableMap.get(alignedTable);
    const firstColumnCell = alignedTableFrom + 1 +
      map.positionAt(0, 0, alignedTable);
    const lastColumnCell = alignedTableFrom + 1 +
      map.positionAt(1, 2, alignedTable);
    const selection = CellSelection.create(
      alignedDocument,
      firstColumnCell,
      lastColumnCell,
    );

    expect(
      getActiveTableColumnContext(selection, schema.nodes.table),
    ).toMatchObject({ alignment: 'right', columnIndex: 2 });
  });

  it('reports no active alignment when cells in the column are mixed', () => {
    const mixedTable = alignedTable.copy(
      alignedTable.content.replaceChild(
        1,
        row([
          cell('table_cell', '왼쪽'),
          cell('table_cell', '가운데', 'right'),
          cell('table_cell', '100', 'right'),
        ]),
      ),
    );
    const mixedDocument = schema.node('doc', null, [
      paragraph('Before'),
      mixedTable,
    ]);
    let centerPosition = 0;
    mixedDocument.descendants((node, position) => {
      if (node.isText && node.text === '가운데') {
        centerPosition = position + 1;
        return false;
      }

      return true;
    });
    const selection = TextSelection.create(mixedDocument, centerPosition);

    expect(
      getActiveTableColumnContext(selection, schema.nodes.table),
    ).toMatchObject({ alignment: undefined, columnIndex: 1 });
  });

  it('does not infer a column from a whole-table node selection', () => {
    const selection = NodeSelection.create(
      alignedDocument,
      alignedTableFrom,
    );

    expect(
      getActiveTableColumnContext(selection, schema.nodes.table),
    ).toBeUndefined();
  });
});

describe('deleteActiveTable', () => {
  it('deletes only the active table in one undoable transaction', () => {
    let state = EditorState.create({
      doc: documentNode,
      plugins: [history()],
      selection: TextSelection.create(
        documentNode,
        findTextPosition('Body') + 1,
      ),
    });
    const dispatch = (transaction: Parameters<typeof state.apply>[0]) => {
      state = state.apply(transaction);
    };

    expect(deleteActiveTable(state, dispatch, schema.nodes.table)).toBe(true);
    expect(state.doc.textContent).toBe('BeforeAfter');
    expect(state.doc.childCount).toBe(2);

    expect(undo(state, dispatch)).toBe(true);
    expect(state.doc.childCount).toBe(3);
    expect(state.doc.textContent).toBe('BeforeHeaderBodyAfter');

    expect(redo(state, dispatch)).toBe(true);
    expect(state.doc.childCount).toBe(2);
  });
});
