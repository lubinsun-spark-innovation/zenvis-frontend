import { generatedNaiveTheme } from './generated/naive-theme';

export const zenvisLightTheme = {
  ...generatedNaiveTheme,
  Button: {
    borderRadiusTiny: '7px',
    borderRadiusSmall: '8px',
    borderRadiusMedium: '10px',
    borderRadiusLarge: '12px',
    fontWeight: '600',
  },
  Card: {
    borderRadius: '16px',
  },
  Dialog: {
    borderRadius: '18px',
  },
  Drawer: {
    borderRadius: '18px 0 0 18px',
  },
  Input: {
    borderRadius: '10px',
  },
  DataTable: {
    borderRadius: '14px',
    thColor: '#f7f9fc',
    thColorHover: '#f1f5fb',
    tdColorHover: '#f7f9ff',
    borderColor: '#e8edf5',
    thFontWeight: '650',
  },
};
