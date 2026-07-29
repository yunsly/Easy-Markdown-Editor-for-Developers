import './attachmentDialog.css';

import { validateAttachmentForm } from './validateAttachmentForm';

export type AttachmentInsertKind = 'image' | 'link';

export interface AttachmentSource {
  requestId: string;
  originalFileName: string;
  detectedKind: 'file' | 'image';
  defaultDestinationFolder: string;
}

export interface AttachmentCopyRequest {
  requestId: string;
  destinationFolder: string;
  fileName: string;
}

export interface AttachmentInsertion {
  kind: AttachmentInsertKind;
  text: string;
}

export interface AttachmentDialog {
  complete: (requestId: string) => AttachmentInsertion | undefined;
  destroy: () => void;
  fail: (requestId: string, message: string) => boolean;
  open: (source: AttachmentSource) => void;
}

export const createAttachmentDialog = (
  anchor: HTMLButtonElement,
  requestCopy: (request: AttachmentCopyRequest) => void,
  cancelRequest: (requestId: string) => void,
): AttachmentDialog => {
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2');
  const sourceField = document.createElement('div');
  const sourceLabel = document.createElement('span');
  const sourceValue = document.createElement('output');
  const destinationField = document.createElement('label');
  const destinationLabel = document.createElement('span');
  const destinationInput = document.createElement('input');
  const fileNameField = document.createElement('label');
  const fileNameLabel = document.createElement('span');
  const fileNameInput = document.createElement('input');
  const kindField = document.createElement('fieldset');
  const kindLegend = document.createElement('legend');
  const imageKindLabel = document.createElement('label');
  const imageKindInput = document.createElement('input');
  const linkKindLabel = document.createElement('label');
  const linkKindInput = document.createElement('input');
  const textField = document.createElement('label');
  const textLabel = document.createElement('span');
  const textInput = document.createElement('input');
  const resultField = document.createElement('div');
  const resultLabel = document.createElement('span');
  const resultValue = document.createElement('output');
  const status = document.createElement('p');
  const actions = document.createElement('div');
  const cancelButton = document.createElement('button');
  const attachButton = document.createElement('button');
  const titleId = 'attachment-dialog-title';
  let activeSource: AttachmentSource | undefined;
  let isCopying = false;
  let isDestroyed = false;
  let lastDestinationFolder: string | undefined;
  let shouldRestoreAnchorFocus = true;

  dialog.className = 'attachment-dialog';
  dialog.setAttribute('aria-labelledby', titleId);
  title.id = titleId;
  title.className = 'attachment-dialog__title';
  title.textContent = 'Attach File';
  sourceField.className = 'attachment-dialog__field';
  sourceLabel.className = 'attachment-dialog__label';
  sourceLabel.textContent = 'Source';
  sourceValue.className = 'attachment-dialog__value';
  sourceField.append(sourceLabel, sourceValue);
  destinationField.className = 'attachment-dialog__field';
  destinationLabel.className = 'attachment-dialog__label';
  destinationLabel.textContent = 'Destination folder';
  destinationInput.className = 'attachment-dialog__input';
  destinationInput.type = 'text';
  destinationField.append(destinationLabel, destinationInput);
  fileNameField.className = 'attachment-dialog__field';
  fileNameLabel.className = 'attachment-dialog__label';
  fileNameLabel.textContent = 'File name';
  fileNameInput.className = 'attachment-dialog__input';
  fileNameInput.type = 'text';
  fileNameField.append(fileNameLabel, fileNameInput);
  kindField.className = 'attachment-dialog__fieldset';
  kindLegend.className = 'attachment-dialog__label';
  kindLegend.textContent = 'Insert as';
  imageKindLabel.className = 'attachment-dialog__radio';
  imageKindInput.type = 'radio';
  imageKindInput.name = 'attachment-kind';
  imageKindInput.value = 'image';
  imageKindLabel.append(imageKindInput, 'Image');
  linkKindLabel.className = 'attachment-dialog__radio';
  linkKindInput.type = 'radio';
  linkKindInput.name = 'attachment-kind';
  linkKindInput.value = 'link';
  linkKindLabel.append(linkKindInput, 'Link');
  kindField.append(kindLegend, imageKindLabel, linkKindLabel);
  textField.className = 'attachment-dialog__field';
  textLabel.className = 'attachment-dialog__label';
  textInput.className = 'attachment-dialog__input';
  textInput.type = 'text';
  textField.append(textLabel, textInput);
  resultField.className = 'attachment-dialog__field';
  resultLabel.className = 'attachment-dialog__label';
  resultLabel.textContent = 'Result path';
  resultValue.className = 'attachment-dialog__value';
  resultField.append(resultLabel, resultValue);
  status.className = 'attachment-dialog__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  actions.className = 'attachment-dialog__actions';
  cancelButton.className = 'attachment-dialog__button';
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  attachButton.className =
    'attachment-dialog__button attachment-dialog__button--primary';
  attachButton.type = 'button';
  attachButton.textContent = 'Attach';
  actions.append(cancelButton, attachButton);
  dialog.append(
    title,
    sourceField,
    destinationField,
    fileNameField,
    kindField,
    textField,
    resultField,
    status,
    actions,
  );
  document.body.append(dialog);
  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-expanded', 'false');

  const getKind = (): AttachmentInsertKind =>
    imageKindInput.checked ? 'image' : 'link';

  const updateForm = (): void => {
    textLabel.textContent = getKind() === 'image' ? 'Alt text' : 'Link text';
    const destination = destinationInput.value.trim().replace(/\/+$/, '');
    const fileName = fileNameInput.value.trim();
    resultValue.textContent = destination.length > 0
      ? `${destination}/${fileName}`
      : fileName;
    status.textContent = '';
  };

  const close = (): void => {
    if (dialog.open) {
      dialog.close();
    }
  };

  const cancelActiveRequest = (): void => {
    if (activeSource !== undefined) {
      cancelRequest(activeSource.requestId);
    }

    close();
  };

  const handleCancel = (): void => {
    cancelActiveRequest();
  };

  const handleDialogCancel = (event: Event): void => {
    event.preventDefault();

    if (isCopying) {
      return;
    }

    cancelActiveRequest();
  };

  const handleDialogClose = (): void => {
    anchor.setAttribute('aria-expanded', 'false');
    activeSource = undefined;
    isCopying = false;
    attachButton.disabled = false;
    cancelButton.disabled = false;

    if (!isDestroyed && shouldRestoreAnchorFocus) {
      anchor.focus({ preventScroll: true });
    }

    shouldRestoreAnchorFocus = true;
  };

  const handleAttach = (): void => {
    if (activeSource === undefined || isCopying) {
      return;
    }

    const destinationFolder = destinationInput.value.trim();
    const fileName = fileNameInput.value.trim();
    const text = textInput.value.trim();
    const error = validateAttachmentForm({
      destinationFolder,
      fileName,
      originalFileName: activeSource.originalFileName,
      text,
    });

    if (error !== undefined) {
      status.textContent = error.message;
      const input = error.field === 'destinationFolder'
        ? destinationInput
        : error.field === 'fileName'
          ? fileNameInput
          : textInput;
      input.focus({ preventScroll: true });
      return;
    }

    isCopying = true;
    attachButton.disabled = true;
    cancelButton.disabled = true;
    status.textContent = 'Copying attachment…';
    requestCopy({
      requestId: activeSource.requestId,
      destinationFolder,
      fileName,
    });
  };

  cancelButton.addEventListener('click', handleCancel);
  attachButton.addEventListener('click', handleAttach);
  dialog.addEventListener('cancel', handleDialogCancel);
  dialog.addEventListener('close', handleDialogClose);
  destinationInput.addEventListener('input', updateForm);
  fileNameInput.addEventListener('input', updateForm);
  imageKindInput.addEventListener('change', updateForm);
  linkKindInput.addEventListener('change', updateForm);

  return {
    complete: (requestId) => {
      if (activeSource?.requestId !== requestId) {
        return undefined;
      }

      lastDestinationFolder = destinationInput.value.trim();
      const insertion = { kind: getKind(), text: textInput.value.trim() };
      shouldRestoreAnchorFocus = false;
      close();
      return insertion;
    },
    destroy: () => {
      isDestroyed = true;
      close();
      cancelButton.removeEventListener('click', handleCancel);
      attachButton.removeEventListener('click', handleAttach);
      dialog.removeEventListener('cancel', handleDialogCancel);
      dialog.removeEventListener('close', handleDialogClose);
      destinationInput.removeEventListener('input', updateForm);
      fileNameInput.removeEventListener('input', updateForm);
      imageKindInput.removeEventListener('change', updateForm);
      linkKindInput.removeEventListener('change', updateForm);
      dialog.remove();
      anchor.removeAttribute('aria-haspopup');
      anchor.removeAttribute('aria-expanded');
    },
    fail: (requestId, message) => {
      if (activeSource?.requestId !== requestId) {
        return false;
      }

      isCopying = false;
      attachButton.disabled = false;
      cancelButton.disabled = false;
      status.textContent = message;
      return true;
    },
    open: (source) => {
      if (isDestroyed || dialog.open) {
        return;
      }

      activeSource = source;
      sourceValue.textContent = source.originalFileName;
      destinationInput.value = lastDestinationFolder ??
        source.defaultDestinationFolder;
      fileNameInput.value = source.originalFileName;
      imageKindInput.checked = source.detectedKind === 'image';
      linkKindInput.checked = source.detectedKind === 'file';
      textInput.value = source.originalFileName;
      shouldRestoreAnchorFocus = true;
      updateForm();
      anchor.setAttribute('aria-expanded', 'true');
      dialog.showModal();
      destinationInput.focus({ preventScroll: true });
    },
  };
};
