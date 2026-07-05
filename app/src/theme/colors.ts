// Semantic color tokens, one palette per mode. Components never reference
// raw hex values — always theme.colors.<token> via useTheme().
//
// Identity: "bold & energetic" — electric lime accent. In light mode the
// raw lime fails contrast as text on white, so `accentEmphasis` exists for
// accent-colored text/icons drawn on the background (dark mode: the lime
// itself; light mode: a darkened lime that passes contrast).

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  accent: string; // fills: buttons, active pills, ring progress
  onAccent: string; // content drawn on top of accent fills
  accentMuted: string; // low-opacity accent wash for highlighted rows/cards
  accentEmphasis: string; // accent used AS text/icon on background/surface

  energy: string; // calories burned, streak flames
  energyMuted: string;

  success: string;
  warning: string;
  danger: string;
  dangerMuted: string;

  protein: string;
  carbs: string;
  fat: string;
  water: string;

  skeleton: string; // skeleton loader base
  overlay: string; // modal/sheet backdrop
}

export const darkColors: ThemeColors = {
  background: '#0B0B0F',
  surface: '#17171D',
  surfaceElevated: '#1F1F27',
  border: '#2A2A33',

  textPrimary: '#FFFFFF',
  textSecondary: '#9B9BA5',
  textTertiary: '#65656F',

  accent: '#CBFF3D',
  onAccent: '#0B0B0F',
  accentMuted: 'rgba(203, 255, 61, 0.14)',
  accentEmphasis: '#CBFF3D',

  energy: '#FF5A3C',
  energyMuted: 'rgba(255, 90, 60, 0.14)',

  success: '#30D158',
  warning: '#FFB020',
  danger: '#FF453A',
  dangerMuted: 'rgba(255, 69, 58, 0.14)',

  protein: '#4DA6FF',
  carbs: '#FFB020',
  fat: '#FF5C8A',
  water: '#38BDF8',

  skeleton: '#1F1F27',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const lightColors: ThemeColors = {
  background: '#F5F5F2',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E3E3DE',

  textPrimary: '#16161A',
  textSecondary: '#5C5C66',
  textTertiary: '#9B9BA0',

  accent: '#CBFF3D',
  onAccent: '#16161A',
  accentMuted: 'rgba(132, 176, 22, 0.14)',
  accentEmphasis: '#5F8C00',

  energy: '#E8472B',
  energyMuted: 'rgba(232, 71, 43, 0.12)',

  success: '#1FA84A',
  warning: '#C77F00',
  danger: '#D93A30',
  dangerMuted: 'rgba(217, 58, 48, 0.12)',

  protein: '#1D7FE0',
  carbs: '#C77F00',
  fat: '#E0447A',
  water: '#0C96D4',

  skeleton: '#E9E9E4',
  overlay: 'rgba(22, 22, 26, 0.4)',
};
