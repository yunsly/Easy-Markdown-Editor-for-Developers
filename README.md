# Easy Markdown Editor for Developers

Easy Markdown Editor for Developers is a VS Code custom editor for editing Markdown as a rendered document. Changes are written back to the original `.md` file through VS Code's document model, so saving, dirty-state tracking, undo, redo, and external file updates stay in the normal editor workflow.

## Features

- Edit headings, paragraphs, blockquotes, code blocks, bulleted lists, numbered lists, and task lists visually.
- Format selected text with bold, italic, strikethrough, inline code, and links.
- Insert tables with a keyboard-accessible size picker and delete the active table from its contextual tooltip.
- Build Shields.io technology badges from presets, with optional labels and click-through links.
- Attach one local file at the cursor as a relative Markdown image or link.
- Switch between rendered Visual editing and syntax-highlighted Markdown Source editing in the same tab.
- Keep multiple Markdown tabs synchronized with their own VS Code documents.
- Follow VS Code light and dark themes.
- Support Korean IME and mixed-language editing without replacing the editor during normal typing.

## Usage

1. Open a `.md` file in VS Code. The extension opens it in Visual mode by default.
2. Use the **Visual | Source** control at the right of the toolbar to switch editing modes in the same tab.
3. Edit the document and save with the standard VS Code save command.

In Visual mode, place the cursor in any table cell to show **Delete Table**
above the whole table. The action uses the normal editor transaction, so one
Undo restores the table. It is intentionally the only command in this
contextual tooltip; row and column controls remain in the table UI.

To attach a file, select **Attach** in the editor toolbar, choose one local
file, confirm a workspace-relative destination and file name, then choose
whether to insert it as an image or link. The default destination is an
`assets/` folder beside the current Markdown document. Existing destination
files are never overwritten; a numeric suffix is added automatically.

The built-in Markdown text editor remains available from **Reopen Editor
With...**. Select **Text Editor** there to bypass the custom editor for a file.

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

This project prioritizes Markdown data safety, document synchronization, and stable Korean IME input. Visual and Source modes keep separate editor Undo histories; switching modes flushes pending document changes but does not provide one continuous history across both editors. The last selected mode is not persisted, and split Visual/Source editing is not supported.

Local attachment supports one file at a time in saved Markdown files inside local workspaces. Undo removes the inserted Markdown but intentionally keeps the copied file. Remote workspaces, multiple-file attachment, drag and drop, clipboard image capture, image processing, Mermaid, mathematics, slash commands, real-time collaboration, and split visual/source editing are outside the current scope.
