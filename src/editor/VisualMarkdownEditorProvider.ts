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
    webviewPanel: WebviewPanel,
    _token: CancellationToken,
  ): void {
    webviewPanel.webview.options = {
      enableScripts: false,
      localResourceRoots: [],
    };

    webviewPanel.webview.html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none';"
  >
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Markdown Editor</title>
</head>
<body>
  <main>
    <h1>Visual Markdown Editor</h1>
    <p>Custom Editor Webview가 준비되었습니다.</p>
  </main>
</body>
</html>`;
  }
}
