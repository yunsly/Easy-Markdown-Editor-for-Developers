import {
  Crepe,
  CrepeFeature,
  type CrepeConfig,
} from '@milkdown/crepe';

import './styles.css';

import {
  onMessageFromExtension,
  postMessageToExtension,
} from './vscodeApi';

const MARKDOWN_UPDATE_DEBOUNCE_MS = 300;

const container = document.querySelector<HTMLElement>('#app');

if (container === null) {
  const errorMessage = 'Missing Webview root element: #app';
  postMessageToExtension({ type: 'reportError', message: errorMessage });
  throw new Error(errorMessage);
}

const errorBanner = document.createElement('div');
errorBanner.className = 'error-message';
errorBanner.setAttribute('role', 'alert');
errorBanner.hidden = true;

const editorRoot = document.createElement('div');
editorRoot.className = 'editor-root';
container.replaceChildren(errorBanner, editorRoot);

const showError = (message: string): void => {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
};

const features = {
  [CrepeFeature.AI]: false,
  [CrepeFeature.BlockEdit]: false,
  [CrepeFeature.ImageBlock]: false,
  [CrepeFeature.Latex]: false,
  [CrepeFeature.LinkTooltip]: false,
  [CrepeFeature.Table]: false,
  [CrepeFeature.Toolbar]: false,
  [CrepeFeature.TopBar]: false,
} satisfies NonNullable<CrepeConfig['features']>;

let crepe: Crepe | undefined;
let latestMarkdown: string | undefined;
let pendingMarkdownUpdate: string | undefined;
let markdownUpdateTimer: number | undefined;
let isCreatingEditor = false;
let isComposing = false;
let isDisposed = false;

const reportEditorError = (error: unknown, fallback: string): void => {
  const message = error instanceof Error ? error.message : fallback;

  showError(message);
  postMessageToExtension({ type: 'reportError', message });
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
  }, MARKDOWN_UPDATE_DEBOUNCE_MS);
};

const queueMarkdownUpdate = (
  editor: Crepe,
  markdown: string,
  previousMarkdown: string,
): void => {
  if (
    isDisposed ||
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

editorRoot.addEventListener('compositionstart', handleCompositionStart);
editorRoot.addEventListener('compositionend', handleCompositionEnd);

const initializeEditor = async (markdown: string): Promise<void> => {
  if (isDisposed || isCreatingEditor || crepe !== undefined) {
    return;
  }

  isCreatingEditor = true;

  const editor = new Crepe({
    root: editorRoot,
    defaultValue: markdown,
    features,
  });

  editor.on((listener) => {
    listener.markdownUpdated((_context, updatedMarkdown, previousMarkdown) => {
      queueMarkdownUpdate(editor, updatedMarkdown, previousMarkdown);
    });
  });

  crepe = editor;
  latestMarkdown = markdown;

  try {
    await editor.create();
  } catch (error: unknown) {
    if (crepe === editor) {
      crepe = undefined;
      latestMarkdown = undefined;
      isComposing = false;
      clearPendingMarkdownUpdate();
    }

    reportEditorError(error, 'Failed to create Milkdown Crepe.');
    await destroyEditor(editor);
  } finally {
    isCreatingEditor = false;

    if (isDisposed && crepe === editor) {
      crepe = undefined;
      latestMarkdown = undefined;
      isComposing = false;
      clearPendingMarkdownUpdate();
      await destroyEditor(editor);
    }
  }
};

const disposeMessageListener = onMessageFromExtension((message) => {
  if (message.type === 'initDocument') {
    void initializeEditor(message.text);
  } else if (message.type === 'showError') {
    showError(message.message);
  }
});

window.addEventListener(
  'unload',
  () => {
    isDisposed = true;
    disposeMessageListener();
    editorRoot.removeEventListener(
      'compositionstart',
      handleCompositionStart,
    );
    editorRoot.removeEventListener(
      'compositionend',
      handleCompositionEnd,
    );
    isComposing = false;
    clearPendingMarkdownUpdate();

    if (!isCreatingEditor && crepe !== undefined) {
      const editor = crepe;
      crepe = undefined;
      latestMarkdown = undefined;
      void destroyEditor(editor);
    }
  },
  { once: true },
);

postMessageToExtension({ type: 'ready' });
