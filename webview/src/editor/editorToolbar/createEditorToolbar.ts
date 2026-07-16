import './editorToolbar.css';

const createToolbarButton = (
  text: string,
  label: string,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.className = 'editor-toolbar__button';
  button.type = 'button';
  button.disabled = true;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.textContent = text;

  return button;
};

export const createEditorToolbar = (): HTMLElement => {
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '문서 편집');
  toolbar.setAttribute('aria-orientation', 'horizontal');
  toolbar.append(
    createToolbarButton('¶', '문단'),
    createToolbarButton('H1', '제목 1'),
    createToolbarButton('H2', '제목 2'),
    createToolbarButton('H3', '제목 3'),
    createToolbarButton('Task', '체크리스트'),
    createToolbarButton('Table', '표 삽입'),
  );

  return toolbar;
};
