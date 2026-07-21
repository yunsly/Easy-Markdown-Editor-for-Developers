import {
  Annotation,
  Transaction,
  type EditorState,
  type TransactionSpec,
} from '@codemirror/state';

export const programmaticSourceUpdate = Annotation.define<boolean>();

export const createSourceDocumentReplacement = (
  state: EditorState,
  markdown: string,
): TransactionSpec | undefined => {
  const currentMarkdown = state.doc.toString();

  if (markdown === currentMarkdown) {
    return undefined;
  }

  const { anchor, head } = state.selection.main;
  const nextLength = markdown.length;

  return {
    annotations: [
      programmaticSourceUpdate.of(true),
      Transaction.addToHistory.of(false),
    ],
    changes: {
      from: 0,
      to: currentMarkdown.length,
      insert: markdown,
    },
    selection: {
      anchor: Math.min(anchor, nextLength),
      head: Math.min(head, nextLength),
    },
  };
};

export const isUserSourceDocumentUpdate = (
  docChanged: boolean,
  transactions: readonly Transaction[],
): boolean => docChanged && transactions.some(
  (transaction) =>
    transaction.docChanged &&
    transaction.annotation(programmaticSourceUpdate) !== true,
);

export const shouldReplaceVisualDocument = (
  sourceMarkdown: string,
  visualMarkdownSnapshot: string | undefined,
): boolean => sourceMarkdown !== visualMarkdownSnapshot;

type EditorMode = 'source' | 'visual';

interface MarkdownUpdatePolicy {
  activeMode: EditorMode;
  isCreatingEditor: boolean;
  isReplacingDocument: boolean;
  isSwitchingMode: boolean;
  origin: EditorMode;
  visualUserMutationObserved: boolean;
}

export const shouldQueueMarkdownUpdate = (
  markdown: string,
  previousMarkdown: string,
  policy: MarkdownUpdatePolicy,
): boolean => {
  if (
    markdown === previousMarkdown ||
    policy.isCreatingEditor ||
    policy.isReplacingDocument ||
    policy.isSwitchingMode ||
    policy.activeMode !== policy.origin
  ) {
    return false;
  }

  return policy.origin === 'source' || policy.visualUserMutationObserved;
};
