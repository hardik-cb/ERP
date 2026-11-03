import { useColorScheme } from 'react-native'

const light = {
  bg: '#f4f5f7',
  cardBg: '#ffffff',
  ink: '#1c1d21',
  inkSoft: '#6b6e76',
  border: '#d8dade',
  borderStrong: '#b9bcc3',
  accent: '#2f6fed',
  accentInk: '#ffffff',
  danger: '#d64545',
  chipBg: '#eef1f6',
}

const dark = {
  bg: '#14151a',
  cardBg: '#1c1e24',
  ink: '#edeef1',
  inkSoft: '#9a9da6',
  border: '#33353d',
  borderStrong: '#45484f',
  accent: '#5b8def',
  accentInk: '#ffffff',
  danger: '#e2685f',
  chipBg: '#262832',
}

export function useTheme() {
  const scheme = useColorScheme()
  return scheme === 'dark' ? dark : light
}
