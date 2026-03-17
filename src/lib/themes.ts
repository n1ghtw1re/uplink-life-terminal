export const THEME_OPTIONS = [
  'AMBER',
  'GRN',
  'DOS',
  'LIGHT',
  'BLOOD',
  'ICE',
  '2077',
  'PASTEL DREAM',
  'KAWAII KITTY',
  'MOCHI MAGIC',
  'PIXEL POP',
  'SWEET CANDY',
  'CHIBI CHILL',
  'RAINBOW BUBBLES',
  'NEON',
  'VOID',
  'PLASMA',
  'EMBER',
  'GLITCH',
  'SYNTH',
  'ATARI',
  'AMIGA',
  'C64',
  'MAC',
  'SINCLAIR',
] as const;

export type ThemeCode = (typeof THEME_OPTIONS)[number];

export const DEFAULT_THEME: ThemeCode = 'AMBER';

export const THEME_CLASS_BY_CODE: Record<ThemeCode, string | null> = {
  AMBER: null,
  GRN: 'theme-green',
  DOS: 'theme-dos',
  LIGHT: 'theme-light',
  BLOOD: 'theme-blood',
  ICE: 'theme-ice',
  '2077': 'theme-cyber2077',
  'PASTEL DREAM': 'theme-pastel-dream',
  'KAWAII KITTY': 'theme-kawaii-kitty',
  'MOCHI MAGIC': 'theme-mochi-magic',
  'PIXEL POP': 'theme-pixel-pop',
  'SWEET CANDY': 'theme-sweet-candy',
  'CHIBI CHILL': 'theme-chibi-chill',
  'RAINBOW BUBBLES': 'theme-rainbow-bubbles',
  NEON: 'theme-neon',
  VOID: 'theme-void',
  PLASMA: 'theme-plasma',
  EMBER: 'theme-ember',
  GLITCH: 'theme-glitch',
  SYNTH: 'theme-synth',
  ATARI: 'theme-atari',
  AMIGA: 'theme-amiga',
  C64: 'theme-c64',
  MAC: 'theme-mac',
  SINCLAIR: 'theme-sinclair',
};

export const THEME_CLASS_NAMES = Object.values(THEME_CLASS_BY_CODE).filter(
  (v): v is string => Boolean(v)
);

export const isThemeCode = (value: string): value is ThemeCode => {
  return (THEME_OPTIONS as readonly string[]).includes(value);
};

export const normalizeTheme = (value?: string | null): ThemeCode => {
  const candidate = (value ?? '').toUpperCase();
  return isThemeCode(candidate) ? candidate : DEFAULT_THEME;
};

export const applyThemeClass = (root: HTMLElement, theme: ThemeCode): void => {
  root.classList.remove(...THEME_CLASS_NAMES);
  const className = THEME_CLASS_BY_CODE[theme];
  if (className) {
    root.classList.add(className);
  }
};
