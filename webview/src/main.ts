import {
  Crepe,
  CrepeFeature,
  type CrepeConfig,
} from '@milkdown/crepe';
import { EditorView as CodeMirrorView } from '@codemirror/view';
import {
  redoCommand,
  undoCommand,
} from '@milkdown/kit/plugin/history';
import { callCommand, replaceAll } from '@milkdown/kit/utils';

import './styles.css';
import './vscode-theme.css';
import './document-layout.css';

import {
  onMessageFromExtension,
  postMessageToExtension,
} from './vscodeApi';
import {
  createEditorToolbar,
  type EditorToolbarAction,
} from './editor/editorToolbar/createEditorToolbar';
import { runEditorToolbarAction } from './editor/editorToolbar/editorToolbarActions';
import { updateEditorToolbarState } from './editor/editorToolbar/editorToolbarState';
import { registerFloatingToolbar } from './editor/floatingToolbar/createFloatingToolbar';

const MARKDOWN_UPDATE_DEBOUNCE_MS = 300;

interface PendingDocumentChange {
  changeId: number;
  markdown: string;
}

interface PendingExternalDocument {
  markdown: string;
  version: number;
}

const container = document.querySelector<HTMLElement>('#app');

if (container === null) {
  const errorMessage = 'Missing Webview root element: #app';
  postMessageToExtension({ type: 'reportError', message: errorMessage });
  throw new Error(errorMessage);
}

const styleNonce = container.dataset.styleNonce;

if (styleNonce === undefined) {
  const errorMessage = 'Missing Webview style nonce.';
  postMessageToExtension({ type: 'reportError', message: errorMessage });
  throw new Error(errorMessage);
}

const errorBanner = document.createElement('div');
errorBanner.className = 'error-message';
errorBanner.setAttribute('role', 'alert');
errorBanner.hidden = true;

const editorRoot = document.createElement('div');
editorRoot.className = 'editor-root';
const editorToolbar = createEditorToolbar(handleEditorToolbarAction);
container.replaceChildren(errorBanner, editorToolbar.element, editorRoot);

const showError = (message: string): void => {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
};

const features = {
  [CrepeFeature.AI]: false,
  [CrepeFeature.BlockEdit]: false,
  [CrepeFeature.ImageBlock]: false,
  [CrepeFeature.Latex]: false,
  [CrepeFeature.LinkTooltip]: true,
  [CrepeFeature.Placeholder]: true,
  [CrepeFeature.Table]: false,
  [CrepeFeature.Toolbar]: false,
  [CrepeFeature.TopBar]: false,
} satisfies NonNullable<CrepeConfig['features']>;

const featureConfigs = {
  [CrepeFeature.CodeMirror]: {
    extensions: [CodeMirrorView.cspNonce.of(styleNonce)],
  },
  [CrepeFeature.Placeholder]: {
    mode: 'doc',
    text: '내용을 입력하세요…',
  },
} satisfies NonNullable<CrepeConfig['featureConfigs']>;

let crepe: Crepe | undefined;
let latestMarkdown: string | undefined;
let pendingMarkdownUpdate: string | undefined;
let markdownUpdateTimer: number | undefined;
let documentVersion: number | undefined;
let pendingDocumentChange: PendingDocumentChange | undefined;
let pendingExternalDocument: PendingExternalDocument | undefined;
let nextChangeId = 1;
let isCreatingEditor = false;
let isComposing = false;
let isDisposed = false;
let isReplacingDocument = false;

const reportEditorError = (error: unknown, fallback: string): void => {
  const message = error instanceof Error ? error.message : fallback;

  showError(message);
  postMessageToExtension({ type: 'reportError', message });
};

function handleEditorToolbarAction(action: EditorToolbarAction): void {
  if (
    isDisposed ||
    isCreatingEditor ||
    isComposing ||
    isReplacingDocument ||
    crepe === undefined
  ) {
    return;
  }

  try {
    runEditorToolbarAction(crepe.editor, action);
  } catch (error: unknown) {
    reportEditorError(error, 'Failed to run editor toolbar action.');
  }
}

const destroyEditor = async (editor: Crepe): Promise<void> => {
  try {
    await editor.destroy();
  } catch (error: unknown) {
    reportEditorError(error, 'Failed to destroy Milkdown Crepe.');
  }
};

const clearMarkdownUpdateTimer = (): void => {
  if (markdownUpdateTimer !== undefined) {
    window.clearTimeout(markdownUpdateTimer);
    markdownUpdateTimer = undefined;
  }
};

const clearPendingMarkdownUpdate = (): void => {
  clearMarkdownUpdateTimer();

  pendingMarkdownUpdate = undefined;
};

const sendLatestMarkdownUpdate = (): void => {
  if (
    isDisposed ||
    documentVersion === undefined ||
    latestMarkdown === undefined ||
    pendingDocumentChange !== undefined
  ) {
    return;
  }

  const changeId = nextChangeId;
  nextChangeId += 1;
  pendingDocumentChange = {
    changeId,
    markdown: latestMarkdown,
  };

  postMessageToExtension({
    type: 'documentChanged',
    text: latestMarkdown,
    baseVersion: documentVersion,
    changeId,
  });
};

const handleDocumentApplied = (
  changeId: number,
  version: number,
): void => {
  const appliedChange = pendingDocumentChange;

  if (appliedChange === undefined || appliedChange.changeId !== changeId) {
    reportEditorError(
      new Error('Received an unexpected documentApplied message.'),
      'Failed to confirm the latest document change.',
    );
    return;
  }

  pendingDocumentChange = undefined;
  documentVersion = version;

  if (latestMarkdown !== appliedChange.markdown) {
    sendLatestMarkdownUpdate();
  }
};

const handleReplaceDocument = (
  markdown: string,
  version: number,
): void => {
  if (isDisposed) {
    return;
  }

  if (isCreatingEditor) {
    pendingExternalDocument = { markdown, version };
    return;
  }

  if (crepe === undefined) {
    reportEditorError(
      new Error('Cannot replace a document before Crepe is initialized.'),
      'Failed to replace the Visual Markdown Editor document.',
    );
    return;
  }

  if (
    isComposing ||
    pendingMarkdownUpdate !== undefined ||
    markdownUpdateTimer !== undefined ||
    pendingDocumentChange !== undefined
  ) {
    reportEditorError(
      new Error('External document change conflicts with local edits.'),
      'Failed to replace the Visual Markdown Editor document.',
    );
    return;
  }

  if (markdown === latestMarkdown) {
    documentVersion = version;
    return;
  }

  isReplacingDocument = true;

  try {
    crepe.editor.action(replaceAll(markdown));
    latestMarkdown = markdown;
    documentVersion = version;
  } catch (error: unknown) {
    reportEditorError(
      error,
      'Failed to replace the Visual Markdown Editor document.',
    );
  } finally {
    isReplacingDocument = false;
  }
};

const schedulePendingMarkdownUpdate = (editor: Crepe): void => {
  clearMarkdownUpdateTimer();

  if (
    isDisposed ||
    isComposing ||
    crepe !== editor ||
    pendingMarkdownUpdate === undefined
  ) {
    return;
  }

  markdownUpdateTimer = window.setTimeout(() => {
    markdownUpdateTimer = undefined;
    const markdownToRecord = pendingMarkdownUpdate;
    pendingMarkdownUpdate = undefined;

    if (
      isDisposed ||
      isComposing ||
      crepe !== editor ||
      markdownToRecord === undefined
    ) {
      return;
    }

    latestMarkdown = markdownToRecord;
    sendLatestMarkdownUpdate();
  }, MARKDOWN_UPDATE_DEBOUNCE_MS);
};

const queueMarkdownUpdate = (
  editor: Crepe,
  markdown: string,
  previousMarkdown: string,
): void => {
  if (
    isDisposed ||
    isReplacingDocument ||
    crepe !== editor ||
    markdown === previousMarkdown
  ) {
    return;
  }

  if (markdown === latestMarkdown) {
    clearPendingMarkdownUpdate();
    return;
  }

  if (markdown === pendingMarkdownUpdate) {
    return;
  }

  pendingMarkdownUpdate = markdown;

  if (isComposing) {
    clearMarkdownUpdateTimer();
    return;
  }

  schedulePendingMarkdownUpdate(editor);
};

const handleCompositionStart = (): void => {
  isComposing = true;
  clearMarkdownUpdateTimer();
};

const handleCompositionEnd = (): void => {
  isComposing = false;

  if (crepe !== undefined) {
    schedulePendingMarkdownUpdate(crepe);
  }
};

const handleHistoryKeydown = (event: KeyboardEvent): void => {
  const key = event.key.toLowerCase();
  const hasPrimaryModifier = event.metaKey || event.ctrlKey;
  const isUndo = hasPrimaryModifier && key === 'z' && !event.shiftKey;
  const isRedo =
    hasPrimaryModifier &&
    (key === 'y' || (key === 'z' && event.shiftKey));

  if (event.altKey || (!isUndo && !isRedo)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (
    isDisposed ||
    isCreatingEditor ||
    isComposing ||
    isReplacingDocument ||
    crepe === undefined
  ) {
    return;
  }

  const command = isRedo ? redoCommand : undoCommand;
  crepe.editor.action(callCommand(command.key));
};

const handleWorkbenchShortcutKeydown = (event: KeyboardEvent): void => {
  const isBoldShortcut =
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'b';
  const editorElement = editorRoot.querySelector<HTMLElement>('.ProseMirror');

  if (
    !isBoldShortcut ||
    editorElement === null ||
    !event.composedPath().includes(editorElement)
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

editorRoot.addEventListener('compositionstart', handleCompositionStart);
editorRoot.addEventListener('compositionend', handleCompositionEnd);
editorRoot.addEventListener('keydown', handleHistoryKeydown, {
  capture: true,
});
editorRoot.addEventListener('keydown', handleWorkbenchShortcutKeydown);

const initializeEditor = async (
  markdown: string,
  version: number,
): Promise<void> => {
  if (isDisposed || isCreatingEditor || crepe !== undefined) {
    return;
  }

  isCreatingEditor = true;

  const editor = new Crepe({
    root: editorRoot,
    defaultValue: markdown,
    features,
    featureConfigs,
  });
  registerFloatingToolbar(editor.editor);

  editor.on((listener) => {
    listener.mounted((context) => {
      updateEditorToolbarState(context, editorToolbar);
    });
    listener.updated((context) => {
      updateEditorToolbarState(context, editorToolbar);
    });
    listener.selectionUpdated((context) => {
      updateEditorToolbarState(context, editorToolbar);
    });
    listener.markdownUpdated((_context, updatedMarkdown, previousMarkdown) => {
      queueMarkdownUpdate(editor, updatedMarkdown, previousMarkdown);
    });
  });

  crepe = editor;
  latestMarkdown = markdown;
  documentVersion = version;
  pendingDocumentChange = undefined;
  nextChangeId = 1;

  try {
    await editor.create();
    editorToolbar.buttons.get('paragraph')?.removeAttribute('disabled');
    editorToolbar.buttons.get('heading-1')?.removeAttribute('disabled');
    editorToolbar.buttons.get('heading-2')?.removeAttribute('disabled');
    editorToolbar.buttons.get('heading-3')?.removeAttribute('disabled');
    editorToolbar.buttons.get('bullet-list')?.removeAttribute('disabled');
  } catch (error: unknown) {
    if (crepe === editor) {
      crepe = undefined;
      latestMarkdown = undefined;
      documentVersion = undefined;
      pendingDocumentChange = undefined;
      pendingExternalDocument = undefined;
      isComposing = false;
      isReplacingDocument = false;
      clearPendingMarkdownUpdate();
    }

    reportEditorError(error, 'Failed to create Milkdown Crepe.');
    await destroyEditor(editor);
  } finally {
    isCreatingEditor = false;

    if (isDisposed && crepe === editor) {
      crepe = undefined;
      latestMarkdown = undefined;
      documentVersion = undefined;
      pendingDocumentChange = undefined;
      pendingExternalDocument = undefined;
      isComposing = false;
      isReplacingDocument = false;
      clearPendingMarkdownUpdate();
      await destroyEditor(editor);
    }
  }

  if (!isDisposed && crepe === editor) {
    const externalDocument = pendingExternalDocument;
    pendingExternalDocument = undefined;

    if (externalDocument !== undefined) {
      handleReplaceDocument(
        externalDocument.markdown,
        externalDocument.version,
      );
    }
  }
};

const disposeMessageListener = onMessageFromExtension((message) => {
  if (message.type === 'initDocument') {
    void initializeEditor(message.text, message.version);
  } else if (message.type === 'documentApplied') {
    handleDocumentApplied(message.changeId, message.version);
  } else if (message.type === 'replaceDocument') {
    handleReplaceDocument(message.text, message.version);
  } else if (message.type === 'showError') {
    showError(message.message);
  }
});

window.addEventListener(
  'unload',
  () => {
    isDisposed = true;
    disposeMessageListener();
    editorToolbar.destroy();
    editorRoot.removeEventListener(
      'compositionstart',
      handleCompositionStart,
    );
    editorRoot.removeEventListener(
      'compositionend',
      handleCompositionEnd,
    );
    editorRoot.removeEventListener('keydown', handleHistoryKeydown, {
      capture: true,
    });
    editorRoot.removeEventListener('keydown', handleWorkbenchShortcutKeydown);
    isComposing = false;
    isReplacingDocument = false;
    clearPendingMarkdownUpdate();

    if (!isCreatingEditor && crepe !== undefined) {
      const editor = crepe;
      crepe = undefined;
      latestMarkdown = undefined;
      documentVersion = undefined;
      pendingDocumentChange = undefined;
      pendingExternalDocument = undefined;
      void destroyEditor(editor);
    }
  },
  { once: true },
);

postMessageToExtension({ type: 'ready' });
