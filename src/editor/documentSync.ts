import { Range, WorkspaceEdit, workspace } from 'vscode';
import type { TextDocument } from 'vscode';

export type ApplyDocumentChangeResult =
  | {
      status: 'applied';
      version: number;
    }
  | {
      status: 'documentClosed';
    }
  | {
      status: 'versionMismatch';
      actualVersion: number;
    }
  | {
      status: 'applyFailed';
    }
  | {
      status: 'contentMismatch';
      actualVersion: number;
    };

export async function applyDocumentChange(
  document: TextDocument,
  markdown: string,
  baseVersion: number,
): Promise<ApplyDocumentChangeResult> {
  if (document.isClosed) {
    return { status: 'documentClosed' };
  }

  if (document.version !== baseVersion) {
    return {
      status: 'versionMismatch',
      actualVersion: document.version,
    };
  }

  const currentMarkdown = document.getText();

  if (currentMarkdown === markdown) {
    return {
      status: 'applied',
      version: document.version,
    };
  }

  const documentRange = new Range(
    document.positionAt(0),
    document.positionAt(currentMarkdown.length),
  );
  const edit = new WorkspaceEdit();
  edit.replace(document.uri, documentRange, markdown);

  let didApply: boolean;

  try {
    didApply = await workspace.applyEdit(edit);
  } catch {
    return { status: 'applyFailed' };
  }

  if (!didApply) {
    return { status: 'applyFailed' };
  }

  if (document.isClosed) {
    return { status: 'documentClosed' };
  }

  if (document.getText() !== markdown) {
    return {
      status: 'contentMismatch',
      actualVersion: document.version,
    };
  }

  return {
    status: 'applied',
    version: document.version,
  };
}
