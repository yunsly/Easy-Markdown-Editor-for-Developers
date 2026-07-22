import type { EditorMode } from '../editorMode';

const CAT_MASCOT_SVG = `
  <svg
    class="cat-mascot"
    viewBox="0 0 120 100"
    aria-hidden="true"
    focusable="false"
  >
    <g class="cat-mascot__tail">
      <path class="cat-mascot__tail-outline" d="M82 78 C105 91 116 73 105 55 C98 44 90 53 96 61" />
      <path class="cat-mascot__tail-fill" d="M82 78 C105 91 116 73 105 55 C98 44 90 53 96 61" />
    </g>
    <g class="cat-mascot__body">
      <path class="cat-mascot__shape" d="M25 39 L23 10 Q23 5 28 8 L45 22 Q60 16 75 22 L92 8 Q97 5 97 10 L95 39 Q101 48 101 61 Q101 82 82 89 Q60 97 38 89 Q19 82 19 61 Q19 48 25 39 Z" />
      <path class="cat-mascot__ear-detail" d="M28 17 L29 31 L39 24 Z M92 17 L91 31 L81 24 Z" />
      <path class="cat-mascot__paw" d="M38 87 Q38 76 47 76 Q55 76 55 90 M65 90 Q65 76 73 76 Q82 76 82 87" />
    </g>
    <g class="cat-mascot__eyes">
      <path class="cat-mascot__eye" d="M46 47 L36 54 L46 61" />
      <path class="cat-mascot__eye" d="M74 47 L84 54 L74 61" />
    </g>
    <g class="cat-mascot__face">
      <path class="cat-mascot__nose" d="M57 64 Q60 67 63 64" />
      <path class="cat-mascot__mouth" d="M60 67 Q60 76 52 73 M60 67 Q60 76 68 73" />
      <path class="cat-mascot__cheek" d="M38 67 L35 71 M43 68 L40 73 M82 67 L85 71 M77 68 L80 73" />
    </g>
  </svg>
`;

export const isCatMascotVisible = (
  mode: EditorMode,
  enabled: boolean,
): boolean => enabled && mode === 'visual';

export const createCatMascot = (): HTMLElement => {
  const overlay = document.createElement('div');
  overlay.className = 'cat-mascot-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const template = document.createElement('template');
  template.innerHTML = CAT_MASCOT_SVG.trim();
  const svg = template.content.firstElementChild;

  if (!(svg instanceof SVGElement)) {
    throw new Error('Failed to create the cat mascot SVG.');
  }

  overlay.append(svg);
  return overlay;
};
