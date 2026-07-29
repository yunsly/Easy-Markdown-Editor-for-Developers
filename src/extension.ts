import { window, type ExtensionContext } from 'vscode';

import { VisualMarkdownEditorProvider } from './editor/VisualMarkdownEditorProvider';

export function activate(context: ExtensionContext): void {
  const provider = new VisualMarkdownEditorProvider(context.extensionUri);

  context.subscriptions.push(
    window.registerCustomEditorProvider(
      VisualMarkdownEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );
}

export function deactivate(): void {}
