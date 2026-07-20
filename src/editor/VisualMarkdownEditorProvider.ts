import { randomBytes } from 'node:crypto';

import { Uri, window, workspace } from 'vscode';
import type {
  CancellationToken,
  CustomTextEditorProvider,
  TextDocument,
  WebviewPanel,
} from 'vscode';

import {
  isWebviewToExtensionMessage,
  type ExtensionToWebviewMessage,
  type WebviewToExtensionMessage,
} from '../shared/messages';
import { applyDocumentChange } from './documentSync';

type DocumentChangedMessage = Extract<
  WebviewToExtensionMessage,
  { type: 'documentChanged' }
>;

interface PendingDocumentApply {
  changeId: number;
  expectedMarkdown: string;
}

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
    let isApplyingDocumentChange = false;
    let isDisposed = false;
    let pendingDocumentApply: PendingDocumentApply | undefined;

    const reportError = (errorMessage: string): void => {
      const showErrorMessage: ExtensionToWebviewMessage = {
        type: 'showError',
        message: errorMessage,
      };

      void window.showErrorMessage(errorMessage);
      void webview.postMessage(showErrorMessage);
    };

    const handleDocumentChanged = async (
      message: DocumentChangedMessage,
    ): Promise<void> => {
      if (isDisposed) {
        return;
      }

      if (isApplyingDocumentChange) {
        reportError(
          'Visual Markdown Editor received overlapping document changes.',
        );
        return;
      }

      isApplyingDocumentChange = true;
      pendingDocumentApply = {
        changeId: message.changeId,
        expectedMarkdown: message.text,
      };

      try {
        const result = await applyDocumentChange(
          document,
          message.text,
          message.baseVersion,
        );

        if (isDisposed) {
          return;
        }

        if (result.status === 'documentClosed') {
          reportError('Visual Markdown Editor document is already closed.');
          return;
        }

        if (result.status === 'versionMismatch') {
          reportError(
            `Visual Markdown Editor rejected an outdated change. Expected document version ${message.baseVersion}, but found ${result.actualVersion}.`,
          );
          return;
        }

        if (result.status === 'applyFailed') {
          reportError(
            'Visual Markdown Editor could not apply the document change.',
          );
          return;
        }

        if (result.status === 'contentMismatch') {
          reportError(
            `Visual Markdown Editor detected a document conflict at version ${result.actualVersion}.`,
          );
          return;
        }

        const appliedMessage: ExtensionToWebviewMessage = {
          type: 'documentApplied',
          changeId: message.changeId,
          version: result.version,
        };
        const didPost = await webview.postMessage(appliedMessage);

        if (!didPost && !isDisposed) {
          void window.showErrorMessage(
            'Visual Markdown Editor could not confirm the document change.',
          );
        }
      } catch (error: unknown) {
        const detail = error instanceof Error ? ` ${error.message}` : '';
        reportError(
          `Visual Markdown Editor failed to update the document.${detail}`,
        );
      } finally {
        pendingDocumentApply = undefined;
        isApplyingDocumentChange = false;
      }
    };

    const documentChangeSubscription = workspace.onDidChangeTextDocument(
      (event) => {
        if (
          isDisposed ||
          event.document !== document ||
          event.contentChanges.length === 0
        ) {
          return;
        }

        const currentMarkdown = event.document.getText();
        const expectedChange = pendingDocumentApply;

        if (
          expectedChange !== undefined &&
          expectedChange.expectedMarkdown === currentMarkdown
        ) {
          return;
        }

        if (!didSendInitialDocument) {
          return;
        }

        const replaceMessage: ExtensionToWebviewMessage = {
          type: 'replaceDocument',
          text: currentMarkdown,
          version: event.document.version,
        };

        void webview.postMessage(replaceMessage).then(
          (didPost) => {
            if (!didPost && !isDisposed) {
              void window.showErrorMessage(
                'Visual Markdown Editor could not send an external document change.',
              );
            }
          },
          () => {
            if (!isDisposed) {
              void window.showErrorMessage(
                'Visual Markdown Editor could not send an external document change.',
              );
            }
          },
        );
      },
    );

    const messageSubscription = webview.onDidReceiveMessage(
      (message: unknown) => {
        if (!isWebviewToExtensionMessage(message)) {
          const errorMessage =
            'Visual Markdown Editor received an invalid Webview message.';
          reportError(errorMessage);
          return;
        }

        if (message.type === 'reportError') {
          void window.showErrorMessage(
            `Visual Markdown Editor Webview: ${message.message}`,
          );
          return;
        }

        if (message.type === 'documentChanged') {
          void handleDocumentChanged(message);
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
      isDisposed = true;
      pendingDocumentApply = undefined;
      messageSubscription.dispose();
      documentChangeSubscription.dispose();
    });

    webview.html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https://img.shields.io; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src ${webview.cspSource} 'nonce-${nonce}';"
  >
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Markdown Editor</title>
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <main id="app" data-style-nonce="${nonce}"></main>
  <script nonce="${nonce}" type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
