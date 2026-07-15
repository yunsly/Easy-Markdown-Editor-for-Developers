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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
  );
}

export function isExtensionToWebviewMessage(
  value: unknown,
): value is ExtensionToWebviewMessage {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case 'initDocument':
    case 'replaceDocument':
      return (
        typeof value.text === 'string' &&
        isNonNegativeSafeInteger(value.version)
      );
    case 'documentApplied':
      return (
        isNonNegativeSafeInteger(value.changeId) &&
        isNonNegativeSafeInteger(value.version)
      );
    case 'showError':
      return typeof value.message === 'string';
    default:
      return false;
  }
}

export function isWebviewToExtensionMessage(
  value: unknown,
): value is WebviewToExtensionMessage {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case 'ready':
      return true;
    case 'documentChanged':
      return (
        typeof value.text === 'string' &&
        isNonNegativeSafeInteger(value.baseVersion) &&
        isNonNegativeSafeInteger(value.changeId)
      );
    case 'reportError':
      return typeof value.message === 'string';
    default:
      return false;
  }
}
