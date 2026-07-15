import { Crepe } from '@milkdown/crepe';

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

const disposeMessageListener = onMessageFromExtension((message) => {
  if (message.type === 'showError') {
    showError(message.message);
  }
});

window.addEventListener('unload', () => disposeMessageListener(), {
  once: true,
});

const crepe = new Crepe({
  root: editorRoot,
  defaultValue: [
    '# Visual Markdown Editor',
    '',
    'Milkdown Crepe is ready.',
    '',
    '- Render Markdown as a document',
    '- Edit content visually',
  ].join('\n'),
  features: {
    [Crepe.Feature.AI]: false,
    [Crepe.Feature.BlockEdit]: false,
    [Crepe.Feature.ImageBlock]: false,
    [Crepe.Feature.Latex]: false,
    [Crepe.Feature.LinkTooltip]: false,
    [Crepe.Feature.Table]: false,
    [Crepe.Feature.Toolbar]: false,
    [Crepe.Feature.TopBar]: false,
  },
});

void crepe
  .create()
  .then(() => postMessageToExtension({ type: 'ready' }))
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Failed to create Milkdown Crepe.';

    showError(message);
    postMessageToExtension({ type: 'reportError', message });
  });
