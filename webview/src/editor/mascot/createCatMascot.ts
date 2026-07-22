import type { EditorMode } from '../editorMode';

const CAT_MASCOT_SVG = `
  <svg
    class="cat-mascot"
    viewBox="0 0 128 96"
    aria-hidden="true"
    focusable="false"
  >
    <g class="cat-mascot__tail">
      <path class="cat-mascot__tail-outline" d="M85 79 C106 91 123 78 115 59 C111 50 102 50 101 58" />
      <path class="cat-mascot__tail-fill" d="M85 79 C106 91 123 78 115 59 C111 50 102 50 101 58" />
    </g>
    <g class="cat-mascot__body">
      <path class="cat-mascot__shape" d="M27 38 L24 15 Q23 8 30 12 L45 25 Q60 19 76 25 L91 12 Q98 8 97 16 L94 38 Q101 46 101 59 Q101 76 86 84 Q75 90 61 90 Q46 90 35 85 Q20 77 20 59 Q20 46 27 38 Z" />
      <path class="cat-mascot__ear-detail" d="M29 19 L31 31 L41 25 Z M92 19 L90 31 L80 25 Z" />
      <path class="cat-mascot__paw" d="M38 84 Q39 77 46 77 Q53 77 54 87 M68 87 Q69 77 76 77 Q83 77 84 84" />
    </g>
    <g class="cat-mascot__eyes">
      <path class="cat-mascot__eye" d="M45 48 L37 54 L45 60" />
      <path class="cat-mascot__eye" d="M76 48 L84 54 L76 60" />
    </g>
    <g class="cat-mascot__face">
      <path class="cat-mascot__nose" d="M57 64 Q61 61 65 64 Q61 69 57 64 Z" />
      <path class="cat-mascot__mouth" d="M61 67 Q61 74 54 73 M61 67 Q61 74 68 73" />
      <circle class="cat-mascot__blush" cx="37" cy="68" r="3" />
      <circle class="cat-mascot__blush" cx="85" cy="68" r="3" />
      <path class="cat-mascot__whisker" d="M25 62 L10 59 M25 68 L9 70 M97 62 L112 59 M97 68 L113 70" />
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
