import { randomBytes } from 'node:crypto';
import path from 'node:path';

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
import { classifyAttachment } from './attachment/attachmentPaths';
import { applyDocumentChange } from './documentSync';

type DocumentChangedMessage = Extract<
  WebviewToExtensionMessage,
  { type: 'documentChanged' }
>;

type RequestAttachmentSourceMessage = Extract<
  WebviewToExtensionMessage,
  { type: 'requestAttachmentSource' }
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
    let isSelectingAttachment = false;
    const pendingAttachmentSources = new Map<string, Uri>();

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
          'Easy Markdown Editor for Developers received overlapping document changes.',
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
          reportError(
            'Easy Markdown Editor for Developers document is already closed.',
          );
          return;
        }

        if (result.status === 'versionMismatch') {
          reportError(
            `Easy Markdown Editor for Developers rejected an outdated change. Expected document version ${message.baseVersion}, but found ${result.actualVersion}.`,
          );
          return;
        }

        if (result.status === 'applyFailed') {
          reportError(
            'Easy Markdown Editor for Developers could not apply the document change.',
          );
          return;
        }

        if (result.status === 'contentMismatch') {
          reportError(
            `Easy Markdown Editor for Developers detected a document conflict at version ${result.actualVersion}.`,
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
            'Easy Markdown Editor for Developers could not confirm the document change.',
          );
        }
      } catch (error: unknown) {
        const detail = error instanceof Error ? ` ${error.message}` : '';
        reportError(
          `Easy Markdown Editor for Developers failed to update the document.${detail}`,
        );
      } finally {
        pendingDocumentApply = undefined;
        isApplyingDocumentChange = false;
      }
    };

    const handleRequestAttachmentSource = async (
      message: RequestAttachmentSourceMessage,
    ): Promise<void> => {
      if (isDisposed || isSelectingAttachment) {
        return;
      }

      const workspaceFolder = workspace.getWorkspaceFolder(document.uri);

      if (
        document.isUntitled ||
        document.uri.scheme !== 'file' ||
        workspaceFolder?.uri.scheme !== 'file'
      ) {
        const failedMessage: ExtensionToWebviewMessage = {
          type: 'attachmentFailed',
          requestId: message.requestId,
          message: 'Attachments require a saved Markdown file in a local workspace.',
        };
        void webview.postMessage(failedMessage);
        return;
      }

      isSelectingAttachment = true;

      try {
        const selectedUris = await window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          title: 'Select a file to attach',
        });

        if (isDisposed) {
          return;
        }

        const sourceUri = selectedUris?.[0];

        if (sourceUri === undefined) {
          const cancelledMessage: ExtensionToWebviewMessage = {
            type: 'attachmentCancelled',
            requestId: message.requestId,
          };
          void webview.postMessage(cancelledMessage);
          return;
        }

        if (sourceUri.scheme !== 'file') {
          const failedMessage: ExtensionToWebviewMessage = {
            type: 'attachmentFailed',
            requestId: message.requestId,
            message: 'Only local files can be attached.',
          };
          void webview.postMessage(failedMessage);
          return;
        }

        const originalFileName = path.posix.basename(sourceUri.path);
        const documentFolder = path.posix.dirname(document.uri.path);
        const defaultDestinationFolder = path.posix.relative(
          workspaceFolder.uri.path,
          path.posix.join(documentFolder, 'assets'),
        );
        pendingAttachmentSources.clear();
        pendingAttachmentSources.set(message.requestId, sourceUri);

        const selectedMessage: ExtensionToWebviewMessage = {
          type: 'attachmentSourceSelected',
          requestId: message.requestId,
          originalFileName,
          detectedKind: classifyAttachment(originalFileName),
          defaultDestinationFolder,
        };
        void webview.postMessage(selectedMessage);
      } catch {
        if (!isDisposed) {
          const failedMessage: ExtensionToWebviewMessage = {
            type: 'attachmentFailed',
            requestId: message.requestId,
            message: 'The selected attachment file could not be opened.',
          };
          void webview.postMessage(failedMessage);
        }
      } finally {
        isSelectingAttachment = false;
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
                'Easy Markdown Editor for Developers could not send an external document change.',
              );
            }
          },
          () => {
            if (!isDisposed) {
              void window.showErrorMessage(
                'Easy Markdown Editor for Developers could not send an external document change.',
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
            'Easy Markdown Editor for Developers received an invalid Webview message.';
          reportError(errorMessage);
          return;
        }

        if (message.type === 'reportError') {
          void window.showErrorMessage(
            `Easy Markdown Editor for Developers Webview: ${message.message}`,
          );
          return;
        }

        if (message.type === 'documentChanged') {
          void handleDocumentChanged(message);
          return;
        }

        if (message.type === 'requestAttachmentSource') {
          void handleRequestAttachmentSource(message);
          return;
        }

        if (message.type !== 'ready') {
          return;
        }

        // VS Code can recreate a hidden Webview context when its tab is shown.
        // Each new context needs the authoritative TextDocument snapshot.
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
                'Easy Markdown Editor for Developers could not send the initial document.',
              );
            }
          },
          () => {
            void window.showErrorMessage(
              'Easy Markdown Editor for Developers could not send the initial document.',
            );
          },
        );
      },
    );

    webviewPanel.onDidDispose(() => {
      isDisposed = true;
      pendingDocumentApply = undefined;
      pendingAttachmentSources.clear();
      messageSubscription.dispose();
      documentChangeSubscription.dispose();
    });

    webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https://img.shields.io; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src ${webview.cspSource} 'nonce-${nonce}';"
  >
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Easy Markdown Editor for Developers</title>
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <main id="app" data-style-nonce="${nonce}"></main>
  <script nonce="${nonce}" type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
