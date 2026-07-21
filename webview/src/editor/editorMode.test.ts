import { describe, expect, it, vi } from 'vitest';

import { createEditorModeState } from './editorMode';

describe('createEditorModeState', () => {
  it('starts in visual mode by default', () => {
    expect(createEditorModeState().getMode()).toBe('visual');
  });

  it('notifies subscribers only when the mode changes', () => {
    const state = createEditorModeState();
    const listener = vi.fn();
    state.subscribe(listener);

    expect(state.setMode('visual')).toBe(false);
    expect(state.setMode('source')).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith('source', 'visual');
  });

  it('stops notifying an unsubscribed listener', () => {
    const state = createEditorModeState();
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);
    unsubscribe();

    state.setMode('source');

    expect(listener).not.toHaveBeenCalled();
  });
});
