import './styles.css';

import {
  onMessageFromExtension,
  postMessageToExtension,
} from './vscodeApi';

const container = document.querySelector<HTMLElement>('#app');

if (container === null) {
  throw new Error('Missing Webview root element: #app');
}

const documentPreview = document.createElement('pre');
documentPreview.className = 'document-preview';
documentPreview.textContent = 'Visual Markdown Editor Webview';
container.replaceChildren(documentPreview);

const disposeMessageListener = onMessageFromExtension((message) => {
  if (message.type === 'initDocument') {
    documentPreview.textContent = message.text;
  }
});

window.addEventListener('unload', () => disposeMessageListener(), {
  once: true,
});

postMessageToExtension({ type: 'ready' });
