export type EditorMode = 'source' | 'visual';

type EditorModeListener = (
  mode: EditorMode,
  previousMode: EditorMode,
) => void;

export interface EditorModeState {
  getMode: () => EditorMode;
  setMode: (mode: EditorMode) => boolean;
  subscribe: (listener: EditorModeListener) => () => void;
}

export const createEditorModeState = (
  initialMode: EditorMode = 'visual',
): EditorModeState => {
  const listeners = new Set<EditorModeListener>();
  let mode = initialMode;

  return {
    getMode: () => mode,
    setMode: (nextMode) => {
      if (nextMode === mode) {
        return false;
      }

      const previousMode = mode;
      mode = nextMode;

      for (const listener of listeners) {
        listener(mode, previousMode);
      }

      return true;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
