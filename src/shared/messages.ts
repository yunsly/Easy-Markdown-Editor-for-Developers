export type ExtensionToWebviewMessage =
  | {
      type: 'initDocument';
      text: string;
      version: number;
    }
  | {
      type: 'replaceDocument';
      text: string;
      version: number;
    }
  | {
      type: 'documentApplied';
      changeId: number;
      version: number;
    }
  | {
      type: 'showError';
      message: string;
    };

export type WebviewToExtensionMessage =
  | {
      type: 'ready';
    }
  | {
      type: 'documentChanged';
      text: string;
      baseVersion: number;
      changeId: number;
    }
  | {
      type: 'reportError';
      message: string;
    };
