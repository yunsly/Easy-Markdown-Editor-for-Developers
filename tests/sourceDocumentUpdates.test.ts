import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { EditorState, Transaction } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import {
  createSourceDocumentReplacement,
  isUserSourceDocumentUpdate,
  programmaticSourceUpdate,
  shouldReplaceVisualDocument,
} from '../webview/src/editor/source/sourceDocumentUpdates';

const fixtureDirectory = resolve(process.cwd(), 'fixtures');
const fixtureNames = readdirSync(fixtureDirectory).filter((name) =>
  name.endsWith('.md')
);

describe('source document updates', () => {
  it('does not create a replacement for identical Markdown', () => {
    const state = EditorState.create({ doc: '# Same\n' });

    expect(createSourceDocumentReplacement(state, '# Same\n')).toBeUndefined();
  });

  it('marks a whole-document replacement as programmatic and non-historic', () => {
    const state = EditorState.create({
      doc: '# Before\n',
      selection: { anchor: 8 },
    });
    const replacement = createSourceDocumentReplacement(state, '# 후\n');

    expect(replacement).toBeDefined();
    const transaction = state.update(replacement ?? {});
    expect(transaction.state.doc.toString()).toBe('# 후\n');
    expect(transaction.state.selection.main.anchor).toBe(4);
    expect(transaction.annotation(programmaticSourceUpdate)).toBe(true);
    expect(transaction.annotation(Transaction.addToHistory)).toBe(false);
    expect(
      isUserSourceDocumentUpdate(true, [transaction]),
    ).toBe(false);
  });

  it('recognizes an actual edit as a user document update', () => {
    const state = EditorState.create({ doc: '# Before\n' });
    const transaction = state.update({
      changes: { from: state.doc.length, insert: '한글' },
    });

    expect(isUserSourceDocumentUpdate(true, [transaction])).toBe(true);
  });

  it('does not hide a user edit batched with a programmatic update', () => {
    const state = EditorState.create({ doc: 'Before' });
    const replacement = state.update({
      annotations: programmaticSourceUpdate.of(true),
      changes: { from: 0, to: state.doc.length, insert: 'External' },
    });
    const userEdit = replacement.state.update({
      changes: { from: replacement.state.doc.length, insert: '!' },
    });

    expect(
      isUserSourceDocumentUpdate(true, [replacement, userEdit]),
    ).toBe(true);
  });

  it.each(fixtureNames)('preserves %s byte-for-byte in Source state', (name) => {
    const markdown = readFileSync(resolve(fixtureDirectory, name), 'utf8');
    const state = EditorState.create();
    const replacement = createSourceDocumentReplacement(state, markdown);
    const transaction = state.update(replacement ?? {});

    expect(transaction.state.doc.toString()).toBe(markdown);
    expect(
      isUserSourceDocumentUpdate(transaction.docChanged, [transaction]),
    ).toBe(false);
    expect(shouldReplaceVisualDocument(markdown, markdown)).toBe(false);
  });

  it('replaces the Visual document only after a Source edit', () => {
    expect(shouldReplaceVisualDocument('# Updated\n', '# Original\n')).toBe(
      true,
    );
  });
});
