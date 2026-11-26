import { Platform } from 'react-native';

export const colors = {
  primary: '#263C52',
  deep: '#192A3C',
  accent: '#E9CB95',
  soft: '#F1ECE2',
  background: '#F8F6F1',
  surface: '#FFFDF9',
  text: '#202B36',
  muted: '#5E646A',
  brass: '#785B28',
  border: '#DCD7CC',
  danger: '#A33B30',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });
export const type = {
  title: { fontFamily: serif, fontWeight: '400', fontSize: 36, letterSpacing: -1 },
  section: { fontFamily: serif, fontWeight: '400', fontSize: 24, letterSpacing: -0.45 },
  amount: { fontFamily: serif, fontWeight: '400', fontVariant: ['tabular-nums'] },
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
};
