import type { EditorMode } from '../editorMode';

interface EditorModeControlOptions {
  initialMode?: EditorMode;
  selectMode: (mode: EditorMode) => void;
}

export interface EditorModeControl {
  destroy: () => void;
  element: HTMLElement;
  setEnabled: (mode: EditorMode, enabled: boolean) => void;
  setMode: (mode: EditorMode) => void;
}

const modes = ['visual', 'source'] as const satisfies readonly EditorMode[];

export const createEditorModeControl = (
  options: EditorModeControlOptions,
): EditorModeControl => {
  const control = document.createElement('div');
  const buttons = new Map<EditorMode, HTMLButtonElement>();
  let currentMode = options.initialMode ?? 'visual';
  control.className = 'editor-mode-control';
  control.setAttribute('role', 'radiogroup');
  control.setAttribute('aria-label', 'Editor mode');

  const updateSelection = (): void => {
    for (const [mode, button] of buttons) {
      const isSelected = mode === currentMode;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-checked', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    }
  };

  const selectEnabledMode = (mode: EditorMode): void => {
    if (mode !== currentMode && !buttons.get(mode)?.disabled) {
      options.selectMode(mode);
    }
  };

  for (const mode of modes) {
    const button = document.createElement('button');
    button.className = 'editor-mode-control__button';
    button.type = 'button';
    button.dataset.mode = mode;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', `${mode === 'visual' ? 'Visual' : 'Source'} mode`);
    button.textContent = mode === 'visual' ? 'Visual' : 'Source';
    button.addEventListener('click', () => {
      selectEnabledMode(mode);
    });
    button.addEventListener('keydown', (event) => {
      const targetMode = event.key === 'ArrowLeft' || event.key === 'Home'
        ? 'visual'
        : event.key === 'ArrowRight' || event.key === 'End'
          ? 'source'
          : undefined;

      if (targetMode === undefined) {
        return;
      }

      event.preventDefault();
      buttons.get(targetMode)?.focus({ preventScroll: true });
      selectEnabledMode(targetMode);
    });
    buttons.set(mode, button);
    control.append(button);
  }

  updateSelection();

  return {
    destroy: () => {
      control.replaceChildren();
    },
    element: control,
    setEnabled: (mode, enabled) => {
      const button = buttons.get(mode);

      if (button !== undefined) {
        button.disabled = !enabled;
      }
    },
    setMode: (mode) => {
      currentMode = mode;
      updateSelection();
    },
  };
};
