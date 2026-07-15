import type { WebviewToExtensionMessage } from '../../src/shared/messages';

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
