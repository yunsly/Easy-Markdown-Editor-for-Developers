import {
  defaultKeymap,
  history,
  historyKeymap,
} from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  HighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { Annotation, Transaction } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';

interface MarkdownSourceEditorOptions {
  markdown: string;
  onChange: (markdown: string, previousMarkdown: string) => void;
  parent: HTMLElement;
  styleNonce: string;
}

export interface MarkdownSourceEditor {
  destroy: () => void;
  focus: () => void;
  getMarkdown: () => string;
  replaceMarkdown: (markdown: string) => void;
}

const programmaticUpdate = Annotation.define<boolean>();

const sourceTheme = EditorView.theme({
  '&': {
    minHeight: 'calc(100vh - 43px)',
    color: 'var(--vscode-editor-foreground)',
    backgroundColor: 'var(--vscode-editor-background)',
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: 'var(--vscode-editor-font-size)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    minHeight: 'calc(100vh - 43px)',
    fontFamily: 'var(--vscode-editor-font-family)',
    lineHeight: 'var(--vscode-editor-line-height, 1.5)',
    overscrollBehaviorInline: 'contain',
  },
  '.cm-content': {
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '960px',
    minHeight: 'calc(100vh - 43px)',
    margin: '0 auto',
    padding: '32px clamp(20px, 8vw, 80px) max(96px, 20vh)',
    caretColor: 'var(--vscode-editorCursor-foreground)',
  },
  '.cm-gutters': {
    color: 'var(--vscode-editorLineNumber-foreground)',
    backgroundColor: 'var(--vscode-editorGutter-background)',
    borderRightColor: 'var(--vscode-editorWidget-border)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--vscode-editor-lineHighlightBackground)',
  },
  '.cm-activeLineGutter': {
    color: 'var(--vscode-editorLineNumber-activeForeground)',
    backgroundColor: 'var(--vscode-editor-lineHighlightBackground)',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--vscode-editor-selectionBackground)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--vscode-editorCursor-foreground)',
  },
});

const sourceHighlightStyle = HighlightStyle.define([
  {
    tag: [tags.heading1, tags.heading2, tags.heading3],
    color: 'var(--vscode-symbolIcon-classForeground)',
    fontWeight: '700',
  },
  {
    tag: [tags.heading4, tags.heading5, tags.heading6],
    color: 'var(--vscode-symbolIcon-classForeground)',
    fontWeight: '600',
  },
  {
    tag: [tags.link, tags.url],
    color: 'var(--vscode-textLink-foreground)',
    textDecoration: 'underline',
  },
  {
    tag: tags.strong,
    fontWeight: '700',
  },
  {
    tag: tags.emphasis,
    fontStyle: 'italic',
  },
  {
    tag: [tags.monospace, tags.string],
    color: 'var(--vscode-textPreformat-foreground)',
  },
  {
    tag: [tags.comment, tags.quote],
    color: 'var(--vscode-descriptionForeground)',
  },
  {
    tag: [tags.meta, tags.processingInstruction],
    color: 'var(--vscode-symbolIcon-keyForeground)',
  },
]);

export const createMarkdownSourceEditor = (
  options: MarkdownSourceEditorOptions,
): MarkdownSourceEditor => {
  const editorView = new EditorView({
    doc: options.markdown,
    parent: options.parent,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      markdown(),
      syntaxHighlighting(sourceHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      sourceTheme,
      EditorView.cspNonce.of(options.styleNonce),
      EditorView.updateListener.of((update) => {
        if (
          !update.docChanged ||
          update.transactions.some(
            (transaction) =>
              transaction.annotation(programmaticUpdate) === true,
          )
        ) {
          return;
        }

        options.onChange(
          update.state.doc.toString(),
          update.startState.doc.toString(),
        );
      }),
    ],
  });

  return {
    destroy: () => {
      editorView.destroy();
    },
    focus: () => {
      editorView.focus();
    },
    getMarkdown: () => editorView.state.doc.toString(),
    replaceMarkdown: (markdownText) => {
      const currentMarkdown = editorView.state.doc.toString();

      if (markdownText === currentMarkdown) {
        return;
      }

      const { anchor, head } = editorView.state.selection.main;
      const nextLength = markdownText.length;
      editorView.dispatch({
        annotations: [
          programmaticUpdate.of(true),
          Transaction.addToHistory.of(false),
        ],
        changes: {
          from: 0,
          to: currentMarkdown.length,
          insert: markdownText,
        },
        selection: {
          anchor: Math.min(anchor, nextLength),
          head: Math.min(head, nextLength),
        },
      });
    },
  };
};
