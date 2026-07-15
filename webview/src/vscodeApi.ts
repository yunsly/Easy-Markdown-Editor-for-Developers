import {
  isExtensionToWebviewMessage,
  type ExtensionToWebviewMessage,
  type WebviewToExtensionMessage,
} from '../../src/shared/messages';

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscodeApi = acquireVsCodeApi();

export function postMessageToExtension(
  message: WebviewToExtensionMessage,
): void {
  vscodeApi.postMessage(message);
}

export function onMessageFromExtension(
  listener: (message: ExtensionToWebviewMessage) => void,
): () => void {
  const handleMessage = (event: MessageEvent<unknown>): void => {
    if (!isExtensionToWebviewMessage(event.data)) {
      postMessageToExtension({
        type: 'reportError',
        message: 'Webview received an invalid Extension Host message.',
      });
      return;
    }

    listener(event.data);
  };

  window.addEventListener('message', handleMessage);

  return () => window.removeEventListener('message', handleMessage);
}
