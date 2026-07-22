import type { EditorMode } from '../editorMode';

const CAT_MASCOT_SVG = `
  <svg
    class="cat-mascot"
    viewBox="0 0 128 124"
    aria-hidden="true"
    focusable="false"
  >
    <ellipse class="cat-mascot__shadow" cx="63" cy="115" rx="51" ry="5" />
    <g class="cat-mascot__tail">
      <path class="cat-mascot__tail-outline" d="M81 103 C99 115 120 109 117 92 C115 80 102 77 96 86 C91 93 97 100 104 95" />
      <path class="cat-mascot__tail-fill" d="M81 103 C99 115 120 109 117 92 C115 80 102 77 96 86 C91 93 97 100 104 95" />
      <path class="cat-mascot__tail-highlight" d="M101 108 Q114 104 113 92 Q112 85 106 84" />
    </g>
    <g class="cat-mascot__cat">
      <g class="cat-mascot__body">
        <path class="cat-mascot__body-shape" d="M41 66 Q30 76 31 96 Q31 105 25 111 Q36 116 47 111 L79 111 Q90 116 101 111 Q94 105 93 96 Q93 76 81 66 Z" />
        <path class="cat-mascot__chest" d="M45 71 Q61 82 78 71 L73 88 L67 85 L62 101 L56 85 L50 89 Z" />
        <path class="cat-mascot__front-leg" d="M47 80 Q43 94 44 112 Q50 117 57 112 L59 84 M77 80 Q81 94 80 112 Q74 117 67 112 L65 84" />
        <ellipse class="cat-mascot__back-paw" cx="33" cy="107" rx="12" ry="9" />
        <ellipse class="cat-mascot__back-paw" cx="92" cy="107" rx="12" ry="9" />
        <circle class="cat-mascot__toe-bean" cx="27" cy="109" r="2.6" />
        <circle class="cat-mascot__toe-bean" cx="34" cy="111" r="3.1" />
        <circle class="cat-mascot__toe-bean" cx="41" cy="108" r="2.5" />
        <circle class="cat-mascot__toe-bean" cx="85" cy="108" r="2.5" />
        <circle class="cat-mascot__toe-bean" cx="92" cy="111" r="3.1" />
        <circle class="cat-mascot__toe-bean" cx="99" cy="109" r="2.6" />
        <path class="cat-mascot__head" d="M27 36 L22 14 Q21 7 28 11 L45 26 Q62 20 79 26 L96 12 Q103 8 101 16 L97 39 Q103 48 100 59 Q97 72 82 78 Q63 85 43 78 Q27 73 24 60 Q21 48 27 36 Z" />
        <path class="cat-mascot__ear-detail" d="M28 19 L31 34 L43 27 Z M96 20 L93 34 L81 27 Z" />
        <path class="cat-mascot__ear-warmth" d="M29 20 L32 31 L36 28 Z M95 21 L92 31 L88 28 Z" />
        <path class="cat-mascot__fur-highlight" d="M39 28 Q49 23 58 26 M69 25 Q78 24 87 29 M29 61 Q35 72 48 76 M95 61 Q90 72 77 76" />
        <path class="cat-mascot__front-toes" d="M46 111 L48 106 M52 113 L53 107 M79 111 L77 106 M73 113 L72 107" />
      </g>
      <g class="cat-mascot__eyes">
        <path class="cat-mascot__eye" d="M46 48 L37 54 L47 58" />
        <path class="cat-mascot__eye" d="M78 48 L87 54 L77 58" />
      </g>
      <g class="cat-mascot__face">
        <path class="cat-mascot__nose" d="M58 61 Q62 58 66 61 Q62 66 58 61 Z" />
        <path class="cat-mascot__mouth" d="M62 64 Q62 70 56 69 M62 64 Q62 70 68 69" />
        <path class="cat-mascot__whisker" d="M27 58 L10 55 M27 63 L8 64 M97 58 L114 55 M97 63 L116 65" />
      </g>
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
