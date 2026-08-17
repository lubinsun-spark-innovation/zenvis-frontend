import type { GlobalThemeOverrides } from 'naive-ui';

import { designTokens } from './design-tokens.mjs';

type ThemeTokens = Record<string, string>;

const token = (tokens: ThemeTokens, name: string) => tokens[name] || designTokens[name];

export const buildNaiveTheme = (tokens: ThemeTokens): GlobalThemeOverrides => ({
  common: {
    primaryColor: token(tokens, '--zv-primary'),
    primaryColorHover: token(tokens, '--zv-primary-hover'),
    primaryColorPressed: token(tokens, '--zv-primary-pressed'),
    primaryColorSuppl: token(tokens, '--zv-primary-hover'),
    infoColor: token(tokens, '--zv-info'),
    successColor: token(tokens, '--zv-success'),
    warningColor: token(tokens, '--zv-warning'),
    errorColor: token(tokens, '--zv-danger'),
    bodyColor: token(tokens, '--zv-bg-canvas'),
    cardColor: token(tokens, '--zv-bg-surface'),
    modalColor: token(tokens, '--zv-bg-surface'),
    popoverColor: token(tokens, '--zv-bg-surface'),
    tableColor: token(tokens, '--zv-bg-surface'),
    inputColor: token(tokens, '--zv-bg-surface'),
    actionColor: token(tokens, '--zv-bg-subtle'),
    textColorBase: token(tokens, '--zv-text-primary'),
    borderColor: token(tokens, '--zv-border'),
    dividerColor: token(tokens, '--zv-divider'),
    borderRadius: token(tokens, '--zv-radius'),
    borderRadiusSmall: token(tokens, '--zv-radius-sm'),
    fontFamily: token(tokens, '--zv-font-family'),
    fontSize: '14px',
    boxShadow1: token(tokens, '--zv-shadow-sm'),
    boxShadow2: token(tokens, '--zv-shadow-md'),
    boxShadow3: token(tokens, '--zv-shadow-lg'),
  },
  Button: {
    borderRadiusTiny: token(tokens, '--zv-radius-sm'),
    borderRadiusSmall: token(tokens, '--zv-radius-sm'),
    borderRadiusMedium: token(tokens, '--zv-radius'),
    borderRadiusLarge: token(tokens, '--zv-radius-lg'),
    fontWeight: '600',
  },
  Card: {
    borderRadius: token(tokens, '--zv-radius-lg'),
  },
  Dialog: {
    borderRadius: token(tokens, '--zv-radius-lg'),
  },
  Drawer: {
    borderRadius: `${token(tokens, '--zv-radius-lg')} 0 0 ${token(tokens, '--zv-radius-lg')}`,
  },
  Input: {
    borderRadius: token(tokens, '--zv-radius'),
  },
  DataTable: {
    borderRadius: token(tokens, '--zv-radius-lg'),
    thColor: token(tokens, '--zv-bg-subtle'),
    thColorHover: token(tokens, '--zv-bg-muted'),
    tdColorHover: token(tokens, '--zv-primary-soft'),
    borderColor: token(tokens, '--zv-border'),
    thFontWeight: '650',
  },
});

export const zenvisLightTheme = buildNaiveTheme(designTokens);
