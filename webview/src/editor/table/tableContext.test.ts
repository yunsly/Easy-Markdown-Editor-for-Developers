import { Schema } from '@milkdown/kit/prose/model';
import {
  EditorState,
  NodeSelection,
  TextSelection,
} from '@milkdown/kit/prose/state';
import { tableNodes } from '@milkdown/kit/prose/tables';
import { describe, expect, it } from 'vitest';

import { getActiveTableContext } from './tableContext';

const tableSpecs = tableNodes({
  cellAttributes: {},
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
const cell = (type: 'table_cell' | 'table_header', text: string) =>
  schema.node(type, null, paragraph(text));
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
