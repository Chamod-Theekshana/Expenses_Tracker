// ── Dark palette (default) ──────────────────────────────────────
export const colors = {
  bg: '#0F1117',
  surface: '#181B23',
  surface2: '#1F2330',
  text: '#ECEEF4',
  textSecondary: '#B0B4C3',
  muted: '#6E7490',
  border: 'rgba(236,238,244,0.07)',
  accent: '#6C5CE7',
  accentLight: '#A29BFE',
  accentBg: 'rgba(108,92,231,0.10)',
  danger: '#FF6B6B',
  success: '#2ED573',
  warning: '#FFAA00',
  cardShadow: 'rgba(0,0,0,0.45)',
};

// ── Light palette ───────────────────────────────────────────────
export const lightColors: typeof colors = {
  bg: '#F7F8FC',
  surface: '#FFFFFF',
  surface2: '#EEF0F6',
  text: '#1A1D2E',
  textSecondary: '#5A5F7A',
  muted: '#8B90A7',
  border: 'rgba(26,29,46,0.08)',
  accent: '#6C5CE7',
  accentLight: '#A29BFE',
  accentBg: 'rgba(108,92,231,0.06)',
  danger: '#FF6B6B',
  success: '#2ED573',
  warning: '#FFAA00',
  cardShadow: 'rgba(0,0,0,0.06)',
};

// ── Spacing ─────────────────────────────────────────────────────
export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
};

// ── Border radius ───────────────────────────────────────────────
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  full: 999,
};

// ── Typography scale ────────────────────────────────────────────
export const typography = {
  largeTitle: { fontSize: 32, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.4 },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.2 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  small: { fontSize: 11, lineHeight: 16, fontWeight: '500' as const },
};

// ── 4-point spacing grid (additive — does not replace `spacing`) ──
export const space = {
  '4': 4,
  '8': 8,
  '12': 12,
  '16': 16,
  '24': 24,
  '32': 32,
} as const;

// ── Shadows (iOS + Android) ────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ── Motion timing constants ─────────────────────────────────────
export const motion = {
  fast: 200,
  normal: 300,
  slow: 450,
} as const;

