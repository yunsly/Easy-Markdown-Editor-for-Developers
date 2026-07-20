import './badgeBuilder.css';

export interface BadgeBuilder {
  close: () => void;
  destroy: () => void;
  open: () => void;
}

export const createBadgeBuilder = (
  anchor: HTMLButtonElement,
): BadgeBuilder => {
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2');
  const description = document.createElement('p');
  const actions = document.createElement('div');
  const cancelButton = document.createElement('button');
  const insertButton = document.createElement('button');
  const titleId = 'badge-builder-title';
  let isDestroyed = false;

  dialog.className = 'badge-builder';
  dialog.setAttribute('aria-labelledby', titleId);
  title.id = titleId;
  title.className = 'badge-builder__title';
  title.textContent = 'Insert Badge';
  description.className = 'badge-builder__description';
  description.textContent = 'Badge 옵션을 선택해 Markdown에 삽입합니다.';
  actions.className = 'badge-builder__actions';
  cancelButton.className = 'badge-builder__button';
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  insertButton.className =
    'badge-builder__button badge-builder__button--primary';
  insertButton.type = 'button';
  insertButton.textContent = 'Insert';
  insertButton.disabled = true;
  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-expanded', 'false');
  actions.append(cancelButton, insertButton);
  dialog.append(title, description, actions);
  document.body.append(dialog);

  const close = (): void => {
    if (dialog.open) {
      dialog.close();
    }
  };

  const handleCancelClick = (): void => {
    close();
  };

  const handleDialogCancel = (event: Event): void => {
    event.preventDefault();
    close();
  };

  const handleDialogClose = (): void => {
    anchor.setAttribute('aria-expanded', 'false');

    if (!isDestroyed) {
      anchor.focus({ preventScroll: true });
    }
  };

  cancelButton.addEventListener('click', handleCancelClick);
  dialog.addEventListener('cancel', handleDialogCancel);
  dialog.addEventListener('close', handleDialogClose);

  return {
    close,
    destroy: () => {
      isDestroyed = true;
      close();
      cancelButton.removeEventListener('click', handleCancelClick);
      dialog.removeEventListener('cancel', handleDialogCancel);
      dialog.removeEventListener('close', handleDialogClose);
      dialog.remove();
      anchor.removeAttribute('aria-haspopup');
      anchor.removeAttribute('aria-expanded');
    },
    open: () => {
      if (isDestroyed || dialog.open) {
        return;
      }

      anchor.setAttribute('aria-expanded', 'true');
      dialog.showModal();
      cancelButton.focus({ preventScroll: true });
    },
  };
};
