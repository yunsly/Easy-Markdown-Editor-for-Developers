import { randomBytes } from 'node:crypto';

import { Uri, window } from 'vscode';
import type {
  CancellationToken,
  CustomTextEditorProvider,
  TextDocument,
  WebviewPanel,
} from 'vscode';

import {
  isWebviewToExtensionMessage,
  type ExtensionToWebviewMessage,
} from '../shared/messages';

export class VisualMarkdownEditorProvider implements CustomTextEditorProvider {
  public static readonly viewType = 'visualMarkdown.editor';

  public constructor(private readonly extensionUri: Uri) {}

  public resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel,
    _token: CancellationToken,
  ): void {
    const { webview } = webviewPanel;
    const webviewRoot = Uri.joinPath(this.extensionUri, 'dist', 'webview');

    webview.options = {
      enableScripts: true,
      enableForms: false,
      enableCommandUris: false,
      localResourceRoots: [webviewRoot],
    };

    const scriptUri = webview.asWebviewUri(Uri.joinPath(webviewRoot, 'main.js'));
    const styleUri = webview.asWebviewUri(Uri.joinPath(webviewRoot, 'main.css'));
    const nonce = randomBytes(16).toString('base64');
    let didSendInitialDocument = false;

    const messageSubscription = webview.onDidReceiveMessage(
      (message: unknown) => {
        if (!isWebviewToExtensionMessage(message)) {
          const errorMessage =
            'Visual Markdown Editor received an invalid Webview message.';
          const showErrorMessage: ExtensionToWebviewMessage = {
            type: 'showError',
            message: errorMessage,
          };

          void window.showErrorMessage(errorMessage);
          void webview.postMessage(showErrorMessage);
          return;
        }

        if (message.type === 'reportError') {
          void window.showErrorMessage(
            `Visual Markdown Editor Webview: ${message.message}`,
          );
          return;
        }

        if (message.type !== 'ready' || didSendInitialDocument) {
          return;
        }

        didSendInitialDocument = true;

        const initialDocument: ExtensionToWebviewMessage = {
          type: 'initDocument',
          text: document.getText(),
          version: document.version,
        };

        void webview.postMessage(initialDocument).then(
          (didPost) => {
            if (!didPost) {
              void window.showErrorMessage(
                'Visual Markdown Editor could not send the initial document.',
              );
            }
          },
          () => {
            void window.showErrorMessage(
              'Visual Markdown Editor could not send the initial document.',
            );
          },
        );
      },
    );

    webviewPanel.onDidDispose(() => {
      messageSubscription.dispose();
    });

    webview.html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource}; script-src ${webview.cspSource} 'nonce-${nonce}';"
  >
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Markdown Editor</title>
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <main id="app"></main>
  <script nonce="${nonce}" type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
