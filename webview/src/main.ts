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

const documentPreview = document.createElement('pre');
documentPreview.className = 'document-preview';
documentPreview.textContent = 'Visual Markdown Editor Webview';
container.replaceChildren(errorBanner, documentPreview);

const disposeMessageListener = onMessageFromExtension((message) => {
  if (message.type === 'initDocument') {
    documentPreview.textContent = message.text;
  } else if (message.type === 'showError') {
    errorBanner.textContent = message.message;
    errorBanner.hidden = false;
  }
});

window.addEventListener('unload', () => disposeMessageListener(), {
  once: true,
});

postMessageToExtension({ type: 'ready' });
