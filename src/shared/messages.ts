export type ExtensionToWebviewMessage =
  | {
      type: 'initDocument';
      text: string;
      version: number;
      resourceBaseUri?: string;
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
    }
  | {
      type: 'attachmentSourceSelected';
      requestId: string;
      originalFileName: string;
      detectedKind: 'file' | 'image';
      defaultDestinationFolder: string;
    }
  | {
      type: 'attachmentReady';
      requestId: string;
      markdownPath: string;
      finalFileName: string;
      detectedKind: 'file' | 'image';
    }
  | {
      type: 'attachmentCancelled';
      requestId: string;
    }
  | {
      type: 'attachmentFailed';
      requestId: string;
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
    }
  | {
      type: 'requestAttachmentSource';
      requestId: string;
    }
  | {
      type: 'copyAttachment';
      requestId: string;
      destinationFolder: string;
      fileName: string;
    }
  | {
      type: 'cancelAttachment';
      requestId: string;
    }
  | {
      type: 'writeClipboardText';
      text: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
  );
}

function isAttachmentKind(value: unknown): value is 'file' | 'image' {
  return value === 'file' || value === 'image';
}

function hasRequestId(value: Record<string, unknown>): boolean {
  return typeof value.requestId === 'string' && value.requestId.length > 0;
}

export function isExtensionToWebviewMessage(
  value: unknown,
): value is ExtensionToWebviewMessage {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case 'initDocument':
      return (
        typeof value.text === 'string' &&
        isNonNegativeSafeInteger(value.version) &&
        (
          value.resourceBaseUri === undefined ||
          typeof value.resourceBaseUri === 'string'
        )
      );
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
    case 'attachmentSourceSelected':
      return (
        hasRequestId(value) &&
        typeof value.originalFileName === 'string' &&
        isAttachmentKind(value.detectedKind) &&
        typeof value.defaultDestinationFolder === 'string'
      );
    case 'attachmentReady':
      return (
        hasRequestId(value) &&
        typeof value.markdownPath === 'string' &&
        typeof value.finalFileName === 'string' &&
        isAttachmentKind(value.detectedKind)
      );
    case 'attachmentCancelled':
      return hasRequestId(value);
    case 'attachmentFailed':
      return hasRequestId(value) && typeof value.message === 'string';
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
    case 'requestAttachmentSource':
      return hasRequestId(value);
    case 'copyAttachment':
      return (
        hasRequestId(value) &&
        typeof value.destinationFolder === 'string' &&
        typeof value.fileName === 'string'
      );
    case 'cancelAttachment':
      return hasRequestId(value);
    case 'writeClipboardText':
      return typeof value.text === 'string';
    default:
      return false;
  }
}
