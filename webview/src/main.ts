import {
  Crepe,
  CrepeFeature,
  type CrepeConfig,
} from '@milkdown/crepe';
import { EditorView as CodeMirrorView } from '@codemirror/view';
import type { Ctx } from '@milkdown/kit/ctx';
import { editorViewCtx, EditorStatus } from '@milkdown/kit/core';
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
import { createBadgeBuilder } from './badge/createBadgeBuilder';
import { createAttachmentDialog } from './attachment/createAttachmentDialog';
import {
  createEditorModeState,
  type EditorMode,
} from './editor/editorMode';
import {
  createEditorToolbar,
  type EditorToolbarAction,
  type EditorToolbarActionOptions,
} from './editor/editorToolbar/createEditorToolbar';
import {
  insertCopiedAttachment,
  runEditorToolbarAction,
  textAlignmentPlugins,
} from './editor/editorToolbar/editorToolbarActions';
import { updateEditorToolbarState } from './editor/editorToolbar/editorToolbarState';
import { registerFloatingToolbar } from './editor/floatingToolbar/createFloatingToolbar';
import { registerWorkspaceImageView } from './editor/registerWorkspaceImageView';
import {
  createMarkdownSourceEditor,
  type MarkdownSourceEditor,
} from './editor/source/createMarkdownSourceEditor';
import {
  shouldQueueMarkdownUpdate,
  shouldReplaceVisualDocument,
} from './editor/source/sourceDocumentUpdates';
import { registerTableDeleteTooltip } from './editor/table/createTableDeleteTooltip';

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
const sourceEditorRoot = document.createElement('div');
sourceEditorRoot.className = 'source-editor-root';
sourceEditorRoot.hidden = true;
const editorModeState = createEditorModeState();
const editorToolbar = createEditorToolbar(
  handleEditorToolbarAction,
  handleEditorModeRequest,
);
editorToolbar.modeControl.setEnabled('source', false);
const unsubscribeEditorMode = editorModeState.subscribe((mode) => {
  editorToolbar.modeControl.setMode(mode);
});
const getToolbarButton = (
  action: EditorToolbarAction,
): HTMLButtonElement => {
  const button = editorToolbar.buttons.get(action);

  if (button === undefined) {
    throw new Error(`Missing ${action} Toolbar button.`);
  }

  return button;
};
const badgeButton = getToolbarButton('badge');

const badgeBuilder = createBadgeBuilder(badgeButton, insertBadgeImage);
const attachButton = getToolbarButton('attach');

const attachmentDialog = createAttachmentDialog(
  attachButton,
  (request) => {
    postMessageToExtension({ type: 'copyAttachment', ...request });
  },
  (requestId) => {
    if (requestId === pendingAttachmentRequestId) {
      postMessageToExtension({ type: 'cancelAttachment', requestId });
      pendingAttachmentRequestId = undefined;
      attachButton.disabled = false;
    }
  },
);
container.replaceChildren(
  errorBanner,
  editorToolbar.element,
  editorRoot,
  sourceEditorRoot,
);

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
  [CrepeFeature.Table]: true,
  [CrepeFeature.Toolbar]: false,
  [CrepeFeature.TopBar]: false,
} satisfies NonNullable<CrepeConfig['features']>;

const featureConfigs = {
  [CrepeFeature.CodeMirror]: {
    extensions: [CodeMirrorView.cspNonce.of(styleNonce)],
  },
  [CrepeFeature.Placeholder]: {
    mode: 'doc',
    text: 'Start writing…',
  },
} satisfies NonNullable<CrepeConfig['featureConfigs']>;

let crepe: Crepe | undefined;
let sourceEditor: MarkdownSourceEditor | undefined;
let latestMarkdown: string | undefined;
let visualMarkdownSnapshot: string | undefined;
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
let isSwitchingMode = false;
let visualUserMutationObserved = false;
let pendingAttachmentRequestId: string | undefined;
let restoreScrollFrame: number | undefined;
const editorScrollPositions: Record<EditorMode, number> = {
  source: 0,
  visual: 0,
};

const reportEditorError = (error: unknown, fallback: string): void => {
  const message = error instanceof Error ? error.message : fallback;

  showError(message);
  postMessageToExtension({ type: 'reportError', message });
};

const markVisualUserMutation = (): void => {
  if (
    !isDisposed &&
    !isCreatingEditor &&
    !isReplacingDocument &&
    !isSwitchingMode &&
    editorModeState.getMode() === 'visual'
  ) {
    visualUserMutationObserved = true;
  }
};

function insertBadgeImage(
  image: NonNullable<EditorToolbarActionOptions['image']>,
): boolean {
  if (
    isDisposed ||
    isCreatingEditor ||
    isComposing ||
    isReplacingDocument ||
    editorModeState.getMode() !== 'visual' ||
    crepe === undefined
  ) {
    return false;
  }

  try {
    markVisualUserMutation();
    runEditorToolbarAction(crepe.editor, 'badge', { image });
    return true;
  } catch (error: unknown) {
    reportEditorError(error, 'Failed to insert Badge image.');
    return false;
  }
}

function handleEditorToolbarAction(
  action: EditorToolbarAction,
  options?: EditorToolbarActionOptions,
): void {
  if (
    isDisposed ||
    isCreatingEditor ||
    isComposing ||
    isReplacingDocument ||
    editorModeState.getMode() !== 'visual' ||
    crepe === undefined
  ) {
    return;
  }

  try {
    if (action === 'badge') {
      badgeBuilder.open();
      return;
    }

    if (action === 'attach') {
      if (pendingAttachmentRequestId !== undefined) {
        return;
      }

      const requestId = crypto.randomUUID();
      pendingAttachmentRequestId = requestId;
      attachButton.disabled = true;
      postMessageToExtension({ type: 'requestAttachmentSource', requestId });
      return;
    }

    markVisualUserMutation();
    runEditorToolbarAction(crepe.editor, action, options);
  } catch (error: unknown) {
    reportEditorError(error, 'Failed to run editor toolbar action.');
  }
}

const syncEditorToolbarState = (context: Ctx): void => {
  if (editorModeState.getMode() !== 'visual') {
    for (const button of editorToolbar.buttons.values()) {
      button.disabled = true;
    }

    return;
  }

  const isTableActive = updateEditorToolbarState(context, editorToolbar);

  if (
    isTableActive === undefined ||
    crepe?.editor.status !== EditorStatus.Created
  ) {
    return;
  }

  const tableButton = editorToolbar.buttons.get('table');

  if (tableButton !== undefined) {
    tableButton.disabled = isTableActive;
  }
};

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

const flushPendingMarkdownUpdate = (): void => {
  clearMarkdownUpdateTimer();
  const markdownToRecord = pendingMarkdownUpdate;
  pendingMarkdownUpdate = undefined;

  if (markdownToRecord === undefined) {
    return;
  }

  latestMarkdown = markdownToRecord;
  sendLatestMarkdownUpdate();
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
      'Failed to replace the Easy Markdown Editor for Developers document.',
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
      'Failed to replace the Easy Markdown Editor for Developers document.',
    );
    return;
  }

  if (markdown === latestMarkdown) {
    sourceEditor?.replaceMarkdown(markdown);
    documentVersion = version;
    return;
  }

  isReplacingDocument = true;
  visualUserMutationObserved = false;

  try {
    crepe.editor.action(replaceAll(markdown));
    sourceEditor?.replaceMarkdown(markdown);
    latestMarkdown = markdown;
    visualMarkdownSnapshot = markdown;
    documentVersion = version;
  } catch (error: unknown) {
    reportEditorError(
      error,
      'Failed to replace the Easy Markdown Editor for Developers document.',
    );
  } finally {
    isReplacingDocument = false;
  }
};

const schedulePendingMarkdownUpdate = (): void => {
  clearMarkdownUpdateTimer();

  if (
    isDisposed ||
    isComposing ||
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
      markdownToRecord === undefined
    ) {
      return;
    }

    latestMarkdown = markdownToRecord;
    sendLatestMarkdownUpdate();
  }, MARKDOWN_UPDATE_DEBOUNCE_MS);
};

const queueMarkdownUpdate = (
  origin: EditorMode,
  markdown: string,
  previousMarkdown: string,
): void => {
  if (
    isDisposed ||
    !shouldQueueMarkdownUpdate(markdown, previousMarkdown, {
      activeMode: editorModeState.getMode(),
      isCreatingEditor,
      isReplacingDocument,
      isSwitchingMode,
      origin,
      visualUserMutationObserved,
    })
  ) {
    return;
  }

  if (origin === 'visual') {
    visualMarkdownSnapshot = markdown;
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

  schedulePendingMarkdownUpdate();
};

const handleCompositionStart = (event: CompositionEvent): void => {
  if (event.currentTarget === editorRoot) {
    markVisualUserMutation();
  }

  isComposing = true;
  clearMarkdownUpdateTimer();
};

const handleCompositionEnd = (): void => {
  isComposing = false;

  schedulePendingMarkdownUpdate();
};

const handleSourceSaveKeydown = (event: KeyboardEvent): void => {
  const isSave =
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 's';

  if (isSave && !isComposing) {
    flushPendingMarkdownUpdate();
  }
};

const setVisualToolbarEnabled = (enabled: boolean): void => {
  for (const button of editorToolbar.buttons.values()) {
    button.disabled = !enabled;
  }

  if (enabled && crepe?.editor.status === EditorStatus.Created) {
    crepe.editor.action(syncEditorToolbarState);
  }
};

const restoreModeScroll = (mode: EditorMode): void => {
  if (restoreScrollFrame !== undefined) {
    window.cancelAnimationFrame(restoreScrollFrame);
  }

  restoreScrollFrame = window.requestAnimationFrame(() => {
    restoreScrollFrame = undefined;

    if (!isDisposed && editorModeState.getMode() === mode) {
      window.scrollTo(0, editorScrollPositions[mode]);
    }
  });
};

function handleEditorModeRequest(mode: EditorMode): void {
  if (
    isDisposed ||
    isCreatingEditor ||
    isReplacingDocument ||
    isSwitchingMode ||
    isComposing ||
    mode === editorModeState.getMode() ||
    crepe === undefined ||
    sourceEditor === undefined ||
    document.querySelector(
      'dialog[open], .editor-table-size-picker:not([hidden])',
    ) !== null ||
    pendingAttachmentRequestId !== undefined
  ) {
    return;
  }

  try {
    editorScrollPositions[editorModeState.getMode()] = window.scrollY;

    if (
      editorModeState.getMode() === 'visual' &&
      visualUserMutationObserved
    ) {
      const currentVisualMarkdown = crepe.getMarkdown();
      queueMarkdownUpdate(
        'visual',
        currentVisualMarkdown,
        visualMarkdownSnapshot ?? currentVisualMarkdown,
      );
    }

    flushPendingMarkdownUpdate();
    isSwitchingMode = true;

    if (mode === 'source') {
      if (latestMarkdown === undefined) {
        return;
      }

      badgeBuilder.close();
      visualUserMutationObserved = false;
      sourceEditor.replaceMarkdown(latestMarkdown);
      editorRoot.hidden = true;
      sourceEditorRoot.hidden = false;
      editorModeState.setMode('source');
      setVisualToolbarEnabled(false);
      sourceEditor.focus();
      restoreModeScroll('source');
      return;
    }

    const markdown = sourceEditor.getMarkdown();

    if (shouldReplaceVisualDocument(markdown, visualMarkdownSnapshot)) {
      isReplacingDocument = true;
      visualUserMutationObserved = false;

      try {
        crepe.editor.action(replaceAll(markdown));
        visualMarkdownSnapshot = markdown;
      } finally {
        isReplacingDocument = false;
      }
    }

    sourceEditorRoot.hidden = true;
    editorRoot.hidden = false;
    editorModeState.setMode('visual');
    setVisualToolbarEnabled(true);
    crepe.editor.action((context) => {
      context.get(editorViewCtx).focus();
    });
    restoreModeScroll('visual');
  } catch (error: unknown) {
    reportEditorError(error, 'Failed to switch editor mode.');
  } finally {
    isSwitchingMode = false;
  }
}

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
  markVisualUserMutation();
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
editorRoot.addEventListener('beforeinput', markVisualUserMutation);
sourceEditorRoot.addEventListener('compositionstart', handleCompositionStart);
sourceEditorRoot.addEventListener('compositionend', handleCompositionEnd);
sourceEditorRoot.addEventListener('keydown', handleSourceSaveKeydown, {
  capture: true,
});
editorRoot.addEventListener('keydown', handleHistoryKeydown, {
  capture: true,
});
editorRoot.addEventListener('keydown', handleWorkbenchShortcutKeydown);

const initializeEditor = async (
  markdown: string,
  version: number,
  resourceBaseUri?: string,
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

  editor.editor.use(textAlignmentPlugins);

  if (resourceBaseUri !== undefined) {
    registerWorkspaceImageView(editor.editor, resourceBaseUri);
  }

  registerFloatingToolbar(editor.editor, markVisualUserMutation);
  registerTableDeleteTooltip(editor.editor, {
    canShow: () =>
      !isDisposed &&
      !isReplacingDocument &&
      editorModeState.getMode() === 'visual',
    onDocumentChange: markVisualUserMutation,
  });

  editor.on((listener) => {
    listener.mounted((context) => {
      syncEditorToolbarState(context);
    });
    listener.updated((context) => {
      syncEditorToolbarState(context);
    });
    listener.selectionUpdated((context) => {
      queueMicrotask(() => {
        if (isDisposed || crepe !== editor) {
          return;
        }

        syncEditorToolbarState(context);
      });
    });
    listener.markdownUpdated((_context, updatedMarkdown, previousMarkdown) => {
      queueMarkdownUpdate('visual', updatedMarkdown, previousMarkdown);
    });
  });

  crepe = editor;
  latestMarkdown = markdown;
  visualMarkdownSnapshot = markdown;
  documentVersion = version;
  pendingDocumentChange = undefined;
  nextChangeId = 1;

  try {
    await editor.create();
    sourceEditor = createMarkdownSourceEditor({
      markdown,
      onChange: (updatedMarkdown, previousMarkdown) => {
        queueMarkdownUpdate('source', updatedMarkdown, previousMarkdown);
      },
      parent: sourceEditorRoot,
      styleNonce,
    });
    editorToolbar.modeControl.setEnabled('source', true);
    editorToolbar.buttons.get('paragraph')?.removeAttribute('disabled');
    editorToolbar.buttons.get('heading-1')?.removeAttribute('disabled');
    editorToolbar.buttons.get('heading-2')?.removeAttribute('disabled');
    editorToolbar.buttons.get('heading-3')?.removeAttribute('disabled');
    editorToolbar.buttons.get('align-left')?.removeAttribute('disabled');
    editorToolbar.buttons.get('align-center')?.removeAttribute('disabled');
    editorToolbar.buttons.get('align-right')?.removeAttribute('disabled');
    editorToolbar.buttons.get('bullet-list')?.removeAttribute('disabled');
    editorToolbar.buttons.get('ordered-list')?.removeAttribute('disabled');
    editorToolbar.buttons.get('task-list')?.removeAttribute('disabled');
    editorToolbar.buttons.get('blockquote')?.removeAttribute('disabled');
    editorToolbar.buttons.get('code-block')?.removeAttribute('disabled');
    editorToolbar.buttons.get('table')?.removeAttribute('disabled');
    editorToolbar.buttons.get('badge')?.removeAttribute('disabled');
    editorToolbar.buttons.get('attach')?.removeAttribute('disabled');
    editor.editor.action(syncEditorToolbarState);
  } catch (error: unknown) {
    if (crepe === editor) {
      sourceEditor?.destroy();
      sourceEditor = undefined;
      crepe = undefined;
      latestMarkdown = undefined;
      visualMarkdownSnapshot = undefined;
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
      sourceEditor?.destroy();
      sourceEditor = undefined;
      crepe = undefined;
      latestMarkdown = undefined;
      visualMarkdownSnapshot = undefined;
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
    void initializeEditor(
      message.text,
      message.version,
      message.resourceBaseUri,
    );
  } else if (message.type === 'documentApplied') {
    handleDocumentApplied(message.changeId, message.version);
  } else if (message.type === 'replaceDocument') {
    handleReplaceDocument(message.text, message.version);
  } else if (message.type === 'showError') {
    showError(message.message);
  } else if (message.type === 'attachmentSourceSelected') {
    if (message.requestId === pendingAttachmentRequestId) {
      attachmentDialog.open(message);
    }
  } else if (message.type === 'attachmentCancelled') {
    if (message.requestId === pendingAttachmentRequestId) {
      pendingAttachmentRequestId = undefined;
      attachButton.disabled = false;
      attachButton.focus({ preventScroll: true });
    }
  } else if (message.type === 'attachmentFailed') {
    if (!attachmentDialog.fail(message.requestId, message.message)) {
      showError(message.message);
      pendingAttachmentRequestId = undefined;
      attachButton.disabled = false;
    }
  } else if (message.type === 'attachmentReady') {
    if (message.requestId !== pendingAttachmentRequestId) {
      return;
    }

    const insertion = attachmentDialog.complete(message.requestId);
    pendingAttachmentRequestId = undefined;
    attachButton.disabled = false;

    if (
      insertion === undefined ||
      isDisposed ||
      isCreatingEditor ||
      isComposing ||
      isReplacingDocument ||
      crepe === undefined
    ) {
      showError(
        `The file was copied to ${message.markdownPath}, but it could not be inserted.`,
      );
      return;
    }

    try {
      markVisualUserMutation();
      insertCopiedAttachment(crepe.editor, {
        kind: insertion.kind,
        src: message.markdownPath,
        text: insertion.text,
      });
    } catch (error: unknown) {
      reportEditorError(
        error,
        `The file was copied to ${message.markdownPath}, but it could not be inserted.`,
      );
    }
  }
});

window.addEventListener(
  'unload',
  () => {
    isDisposed = true;
    disposeMessageListener();
    badgeBuilder.destroy();
    attachmentDialog.destroy();
    unsubscribeEditorMode();
    editorToolbar.destroy();
    editorRoot.removeEventListener(
      'compositionstart',
      handleCompositionStart,
    );
    editorRoot.removeEventListener(
      'compositionend',
      handleCompositionEnd,
    );
    editorRoot.removeEventListener('beforeinput', markVisualUserMutation);
    sourceEditorRoot.removeEventListener(
      'compositionstart',
      handleCompositionStart,
    );
    sourceEditorRoot.removeEventListener(
      'compositionend',
      handleCompositionEnd,
    );
    sourceEditorRoot.removeEventListener('keydown', handleSourceSaveKeydown, {
      capture: true,
    });
    editorRoot.removeEventListener('keydown', handleHistoryKeydown, {
      capture: true,
    });
    editorRoot.removeEventListener('keydown', handleWorkbenchShortcutKeydown);
    isComposing = false;
    isReplacingDocument = false;
    isSwitchingMode = false;
    if (restoreScrollFrame !== undefined) {
      window.cancelAnimationFrame(restoreScrollFrame);
      restoreScrollFrame = undefined;
    }
    clearPendingMarkdownUpdate();

    if (!isCreatingEditor && crepe !== undefined) {
      const editor = crepe;
      crepe = undefined;
      latestMarkdown = undefined;
      visualMarkdownSnapshot = undefined;
      documentVersion = undefined;
      pendingDocumentChange = undefined;
      pendingExternalDocument = undefined;
      sourceEditor?.destroy();
      sourceEditor = undefined;
      void destroyEditor(editor);
    }
  },
  { once: true },
);

postMessageToExtension({ type: 'ready' });
