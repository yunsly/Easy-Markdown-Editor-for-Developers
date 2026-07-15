import type {
  CancellationToken,
  CustomTextEditorProvider,
  TextDocument,
  WebviewPanel,
} from 'vscode';

export class VisualMarkdownEditorProvider implements CustomTextEditorProvider {
  public static readonly viewType = 'visualMarkdown.editor';

  public resolveCustomTextEditor(
    _document: TextDocument,
    _webviewPanel: WebviewPanel,
    _token: CancellationToken,
  ): void {}
}
