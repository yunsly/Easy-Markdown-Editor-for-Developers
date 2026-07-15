import './styles.css';

import { postMessageToExtension } from './vscodeApi';

const container = document.querySelector<HTMLElement>('#app');

if (container === null) {
  throw new Error('Missing Webview root element: #app');
}

container.textContent = 'Visual Markdown Editor Webview';

postMessageToExtension({ type: 'ready' });
