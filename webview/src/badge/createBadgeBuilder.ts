import './badgeBuilder.css';

import { applyBadgePalette } from './applyBadgePalette';
import {
  badgePalettes,
  technologyBadgePresets,
} from './badgePresets';
import type { BadgeDefinition } from './badgeTypes';

export interface BadgeBuilder {
  close: () => void;
  destroy: () => void;
  getDefinition: () => BadgeDefinition;
  open: () => void;
}

export const createBadgeBuilder = (
  anchor: HTMLButtonElement,
): BadgeBuilder => {
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2');
  const description = document.createElement('p');
  const controls = document.createElement('div');
  const technologyField = document.createElement('label');
  const technologyLabel = document.createElement('span');
  const technologySelect = document.createElement('select');
  const paletteField = document.createElement('fieldset');
  const paletteLegend = document.createElement('legend');
  const paletteOptions = document.createElement('div');
  const paletteInputs: HTMLInputElement[] = [];
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
  controls.className = 'badge-builder__controls';
  technologyField.className = 'badge-builder__field';
  technologyLabel.className = 'badge-builder__label';
  technologyLabel.textContent = 'Technology';
  technologySelect.className = 'badge-builder__select';

  for (const preset of technologyBadgePresets) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    technologySelect.append(option);
  }

  technologyField.append(technologyLabel, technologySelect);
  paletteField.className = 'badge-builder__fieldset';
  paletteLegend.className = 'badge-builder__label';
  paletteLegend.textContent = 'Color preset';
  paletteOptions.className = 'badge-builder__palette-options';

  for (const [index, palette] of badgePalettes.entries()) {
    const optionLabel = document.createElement('label');
    const input = document.createElement('input');
    const optionText = document.createElement('span');
    const optionName = document.createElement('strong');
    const optionDescription = document.createElement('span');
    input.type = 'radio';
    input.name = 'badge-palette';
    input.value = palette.id;
    input.checked = index === 0;
    optionLabel.className = 'badge-builder__palette-option';
    optionText.className = 'badge-builder__palette-text';
    optionName.textContent = palette.name;
    optionDescription.className = 'badge-builder__palette-description';
    optionDescription.textContent = palette.description;
    optionText.append(optionName, optionDescription);
    optionLabel.append(input, optionText);
    paletteInputs.push(input);
    paletteOptions.append(optionLabel);
  }

  paletteField.append(paletteLegend, paletteOptions);
  controls.append(technologyField, paletteField);
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
  dialog.append(title, description, controls, actions);
  document.body.append(dialog);

  const getDefinition = (): BadgeDefinition => {
    const technology = technologyBadgePresets.find(
      (preset) => preset.id === technologySelect.value,
    ) ?? technologyBadgePresets[0];
    const palette = badgePalettes.find(
      (candidate) => paletteInputs.some(
        (input) => input.checked && input.value === candidate.id,
      ),
    ) ?? badgePalettes[0];

    return applyBadgePalette(technology, palette);
  };

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
    getDefinition,
    open: () => {
      if (isDestroyed || dialog.open) {
        return;
      }

      technologySelect.value = technologyBadgePresets[0].id;
      for (const [index, input] of paletteInputs.entries()) {
        input.checked = index === 0;
      }
      anchor.setAttribute('aria-expanded', 'true');
      dialog.showModal();
      technologySelect.focus({ preventScroll: true });
    },
  };
};
