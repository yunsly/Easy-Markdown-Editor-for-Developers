# Easy Markdown Editor for Developers

Easy Markdown Editor for Developers is a VS Code custom editor for editing Markdown as a rendered document. Changes are written back to the original `.md` file through VS Code's document model, so saving, dirty-state tracking, undo, redo, and external file updates stay in the normal editor workflow.

## Features

- Edit headings, paragraphs, blockquotes, code blocks, bulleted lists, numbered lists, and task lists visually.
- Format selected text with bold, italic, strikethrough, inline code, and links.
- Insert and remove tables with a keyboard-accessible size picker.
- Build Shields.io technology badges from presets, with optional labels and click-through links.
- Keep multiple Markdown tabs synchronized with their own VS Code documents.
- Follow VS Code light and dark themes.
- Support Korean IME and mixed-language editing without replacing the editor during normal typing.

## Usage

1. Open a `.md` file in VS Code.
2. Open the editor picker from the tab or Explorer context menu.
3. Select **Easy Markdown Editor for Developers**.
4. Edit the rendered document and save with the standard VS Code save command.

The built-in Markdown text editor remains available from **Reopen Editor With...** whenever source-level editing is preferable.

## Install a VSIX

1. Open the Command Palette in VS Code.
2. Run **Extensions: Install from VSIX...**.
3. Select the generated `.vsix` file.
4. Reload VS Code if prompted.

## Development

Requirements:

- Node.js 24 or later
- VS Code 1.125.0 or later

Install dependencies and run the checks:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

Create an installable VSIX:

```bash
npm run package:vsix
```

The package command runs a production build first and writes `easy-markdown-editor-for-developers-<version>.vsix` to the repository root.

## Current Scope

This project prioritizes Markdown data safety, document synchronization, and stable Korean IME input. Advanced table editing, image uploads, Mermaid, mathematics, slash commands, block drag and drop, real-time collaboration, and split visual/source editing are outside the current scope.
