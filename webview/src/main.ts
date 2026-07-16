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
let isCreatingEditor = false;
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

const recordMarkdownUpdate = (
  editor: Crepe,
  markdown: string,
  previousMarkdown: string,
): void => {
  if (
    isDisposed ||
    crepe !== editor ||
    markdown === previousMarkdown ||
    markdown === latestMarkdown
  ) {
    return;
  }

  latestMarkdown = markdown;
};

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
      recordMarkdownUpdate(editor, updatedMarkdown, previousMarkdown);
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
    }

    reportEditorError(error, 'Failed to create Milkdown Crepe.');
    await destroyEditor(editor);
  } finally {
    isCreatingEditor = false;

    if (isDisposed && crepe === editor) {
      crepe = undefined;
      latestMarkdown = undefined;
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
