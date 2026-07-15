import './styles.css';

import {
  onMessageFromExtension,
  postMessageToExtension,
} from './vscodeApi';

const container = document.querySelector<HTMLElement>('#app');

if (container === null) {
  throw new Error('Missing Webview root element: #app');
}

container.textContent = 'Visual Markdown Editor Webview';

const disposeMessageListener = onMessageFromExtension((message) => {
  if (message.type === 'initDocument') {
    container.textContent = message.text;
  }
});

window.addEventListener('unload', () => disposeMessageListener(), {
  once: true,
});

postMessageToExtension({ type: 'ready' });
