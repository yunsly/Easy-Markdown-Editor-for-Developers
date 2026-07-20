import './badgeBuilder.css';

import { applyBadgePalette } from './applyBadgePalette';
import {
  badgePalettes,
  technologyBadgePresets,
} from './badgePresets';
import type { BadgeDefinition, BadgeStyle } from './badgeTypes';
import { createShieldsBadgeUrl } from './createShieldsBadgeUrl';

const badgeStyles = [
  'flat',
  'flat-square',
  'for-the-badge',
] as const satisfies readonly BadgeStyle[];

export interface BadgeBuilder {
  close: () => void;
  destroy: () => void;
  getDefinition: () => BadgeDefinition;
  open: () => void;
}

interface BadgeImage {
  alt: string;
  linkUrl?: string;
  src: string;
}

export const createBadgeBuilder = (
  anchor: HTMLButtonElement,
  insertBadge: (image: BadgeImage) => boolean,
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
  const labelOptions = document.createElement('div');
  const showLabelControl = document.createElement('label');
  const showLabelInput = document.createElement('input');
  const showLabelText = document.createElement('span');
  const labelField = document.createElement('label');
  const labelText = document.createElement('span');
  const labelInput = document.createElement('input');
  const styleField = document.createElement('label');
  const styleLabel = document.createElement('span');
  const styleSelect = document.createElement('select');
  const clickUrlField = document.createElement('label');
  const clickUrlLabel = document.createElement('span');
  const clickUrlInput = document.createElement('input');
  const previewField = document.createElement('div');
  const previewLabel = document.createElement('span');
  const previewContainer = document.createElement('div');
  const previewImage = document.createElement('img');
  const previewStatus = document.createElement('span');
  const actions = document.createElement('div');
  const cancelButton = document.createElement('button');
  const insertButton = document.createElement('button');
  const titleId = 'badge-builder-title';
  let isDestroyed = false;
  let isLabelDirty = false;
  let isShowLabelDirty = false;
  let shouldRestoreAnchorFocus = true;

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
  labelOptions.className = 'badge-builder__label-options';
  showLabelControl.className = 'badge-builder__checkbox';
  showLabelInput.type = 'checkbox';
  showLabelText.textContent = 'Show label';
  showLabelControl.append(showLabelInput, showLabelText);
  labelField.className = 'badge-builder__field';
  labelText.className = 'badge-builder__label';
  labelText.textContent = 'Label';
  labelInput.className = 'badge-builder__input';
  labelInput.type = 'text';
  labelField.append(labelText, labelInput);
  labelOptions.append(showLabelControl, labelField);
  styleField.className = 'badge-builder__field';
  styleLabel.className = 'badge-builder__label';
  styleLabel.textContent = 'Style';
  styleSelect.className = 'badge-builder__select';

  for (const style of badgeStyles) {
    const option = document.createElement('option');
    option.value = style;
    option.textContent = style;
    styleSelect.append(option);
  }

  styleField.append(styleLabel, styleSelect);
  clickUrlField.className = 'badge-builder__field';
  clickUrlLabel.className = 'badge-builder__label';
  clickUrlLabel.textContent = 'Click URL (optional)';
  clickUrlInput.className = 'badge-builder__input';
  clickUrlInput.type = 'url';
  clickUrlInput.inputMode = 'url';
  clickUrlInput.setAttribute('autocomplete', 'url');
  clickUrlInput.placeholder = 'https://example.com';
  clickUrlField.append(clickUrlLabel, clickUrlInput);
  previewField.className = 'badge-builder__field';
  previewLabel.className = 'badge-builder__label';
  previewLabel.textContent = 'Preview';
  previewContainer.className = 'badge-builder__preview';
  previewImage.className = 'badge-builder__preview-image';
  previewImage.alt = 'Badge preview';
  previewImage.hidden = true;
  previewStatus.className = 'badge-builder__preview-status';
  previewStatus.setAttribute('role', 'status');
  previewStatus.setAttribute('aria-live', 'polite');
  previewContainer.append(previewImage, previewStatus);
  previewField.append(previewLabel, previewContainer);
  controls.append(
    technologyField,
    paletteField,
    labelOptions,
    styleField,
    clickUrlField,
    previewField,
  );
  actions.className = 'badge-builder__actions';
  cancelButton.className = 'badge-builder__button';
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  insertButton.className =
    'badge-builder__button badge-builder__button--primary';
  insertButton.type = 'button';
  insertButton.textContent = 'Insert';
  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-expanded', 'false');
  actions.append(cancelButton, insertButton);
  dialog.append(title, description, controls, actions);
  document.body.append(dialog);

  const getSelectedTechnology = () => technologyBadgePresets.find(
    (preset) => preset.id === technologySelect.value,
  ) ?? technologyBadgePresets[0];

  const getSelectedPalette = () => badgePalettes.find(
    (candidate) => paletteInputs.some(
      (input) => input.checked && input.value === candidate.id,
    ),
  ) ?? badgePalettes[0];

  const updateLabelAvailability = (): void => {
    labelInput.disabled = !showLabelInput.checked;
  };

  const getDefinition = (): BadgeDefinition => {
    const definition = applyBadgePalette(
      getSelectedTechnology(),
      getSelectedPalette(),
    );
    definition.style = badgeStyles.find(
      (style) => style === styleSelect.value,
    ) ?? 'flat';

    const label = labelInput.value.trim();

    if (showLabelInput.checked && label.length > 0) {
      definition.label = label;
    } else {
      delete definition.label;
      delete definition.labelColor;
    }

    return definition;
  };

  const updatePreview = (): void => {
    const definition = getDefinition();
    previewImage.hidden = true;
    previewImage.alt = definition.label === undefined
      ? `${definition.message} Badge preview`
      : `${definition.label}: ${definition.message} Badge preview`;
    previewStatus.hidden = false;
    previewStatus.textContent = 'Loading preview…';
    previewImage.src = createShieldsBadgeUrl(definition);
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

    if (!isDestroyed && shouldRestoreAnchorFocus) {
      anchor.focus({ preventScroll: true });
    }

    shouldRestoreAnchorFocus = true;
  };

  const handleInsertClick = (): void => {
    const linkUrl = clickUrlInput.value.trim();

    if (linkUrl.length > 0) {
      let protocol: string | undefined;

      try {
        protocol = new URL(linkUrl).protocol;
      } catch {
        protocol = undefined;
      }

      if (protocol !== 'http:' && protocol !== 'https:') {
        clickUrlInput.setCustomValidity(
          'Click URL은 http:// 또는 https://로 시작해야 합니다.',
        );
        clickUrlInput.reportValidity();
        clickUrlInput.focus({ preventScroll: true });
        return;
      }
    }

    clickUrlInput.setCustomValidity('');
    const definition = getDefinition();
    const image = {
      alt: definition.label === undefined
        ? definition.message
        : `${definition.label}: ${definition.message}`,
      ...(linkUrl.length > 0 ? { linkUrl } : {}),
      src: createShieldsBadgeUrl(definition),
    };
    shouldRestoreAnchorFocus = false;
    close();

    const didInsert = insertBadge(image);

    if (!didInsert && !isDestroyed) {
      anchor.focus({ preventScroll: true });
    }
  };

  const handleTechnologyChange = (): void => {
    if (!isLabelDirty) {
      labelInput.value = getSelectedTechnology().defaultLabel ?? '';
    }

    updatePreview();
  };

  const handlePaletteChange = (): void => {
    if (!isShowLabelDirty) {
      showLabelInput.checked = getSelectedPalette().showLabel;
      updateLabelAvailability();
    }

    updatePreview();
  };

  const handleShowLabelChange = (): void => {
    isShowLabelDirty = true;
    updateLabelAvailability();
    updatePreview();
  };

  const handleLabelInput = (): void => {
    isLabelDirty = true;
    updatePreview();
  };

  const handleStyleChange = (): void => {
    updatePreview();
  };

  const handleClickUrlInput = (): void => {
    clickUrlInput.setCustomValidity('');
  };

  const handlePreviewLoad = (): void => {
    previewImage.hidden = false;
    previewStatus.hidden = true;
  };

  const handlePreviewError = (): void => {
    previewImage.hidden = true;
    previewStatus.hidden = false;
    previewStatus.textContent =
      '미리보기를 불러올 수 없습니다. Badge URL은 계속 생성할 수 있습니다.';
  };

  cancelButton.addEventListener('click', handleCancelClick);
  insertButton.addEventListener('click', handleInsertClick);
  dialog.addEventListener('cancel', handleDialogCancel);
  dialog.addEventListener('close', handleDialogClose);
  technologySelect.addEventListener('change', handleTechnologyChange);
  showLabelInput.addEventListener('change', handleShowLabelChange);
  labelInput.addEventListener('input', handleLabelInput);
  styleSelect.addEventListener('change', handleStyleChange);
  clickUrlInput.addEventListener('input', handleClickUrlInput);
  previewImage.addEventListener('load', handlePreviewLoad);
  previewImage.addEventListener('error', handlePreviewError);

  for (const input of paletteInputs) {
    input.addEventListener('change', handlePaletteChange);
  }

  return {
    close,
    destroy: () => {
      isDestroyed = true;
      close();
      cancelButton.removeEventListener('click', handleCancelClick);
      insertButton.removeEventListener('click', handleInsertClick);
      dialog.removeEventListener('cancel', handleDialogCancel);
      dialog.removeEventListener('close', handleDialogClose);
      technologySelect.removeEventListener('change', handleTechnologyChange);
      showLabelInput.removeEventListener('change', handleShowLabelChange);
      labelInput.removeEventListener('input', handleLabelInput);
      styleSelect.removeEventListener('change', handleStyleChange);
      clickUrlInput.removeEventListener('input', handleClickUrlInput);
      previewImage.removeEventListener('load', handlePreviewLoad);
      previewImage.removeEventListener('error', handlePreviewError);

      for (const input of paletteInputs) {
        input.removeEventListener('change', handlePaletteChange);
      }

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
      isLabelDirty = false;
      isShowLabelDirty = false;
      shouldRestoreAnchorFocus = true;
      labelInput.value = technologyBadgePresets[0].defaultLabel;
      showLabelInput.checked = badgePalettes[0].showLabel;
      styleSelect.value = 'flat';
      clickUrlInput.value = '';
      clickUrlInput.setCustomValidity('');
      updateLabelAvailability();
      updatePreview();
      anchor.setAttribute('aria-expanded', 'true');
      dialog.showModal();
      technologySelect.focus({ preventScroll: true });
    },
  };
};
