import { readonly, shallowRef } from 'vue';

import { normalizeUiThemeManifest, UiThemeService } from '@/service/api/api-ui-theme';
import type { ResolvedUiTheme, UiThemeManifest } from '@/types/type-ui-theme';
import { ls } from '@u/local-storage';
import { buildNaiveTheme } from './naive-theme';
import {
  DEFAULT_UI_THEME_ID,
  resolveBuiltinUiTheme,
  resolveUiThemeManifest,
  validateUiThemeManifest,
} from './theme-registry.mjs';

export const UI_THEME_CHANGE_EVENT = 'zenvis:theme-change';
export const UI_THEME_PREVIEW_KEY = 'zenvis_ui_theme_preview';
export const UI_THEME_CACHE_KEY = 'zenvis_ui_theme_active';

type ThemeSource = 'fallback' | 'cache' | 'server' | 'preview' | 'activation';

const fallbackTheme = resolveBuiltinUiTheme(DEFAULT_UI_THEME_ID);
const activeTheme = shallowRef<ResolvedUiTheme>(fallbackTheme);
const naiveThemeOverrides = shallowRef(buildNaiveTheme(fallbackTheme.tokens));
const themeSource = shallowRef<ThemeSource>('fallback');
const initialized = shallowRef(false);

const safeParse = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readPreview = (): UiThemeManifest | null => {
  try {
    const validation = validateUiThemeManifest(
      safeParse(window.sessionStorage.getItem(UI_THEME_PREVIEW_KEY)),
    );
    return validation.valid ? validation.manifest : null;
  } catch {
    return null;
  }
};

const readCache = (): UiThemeManifest | null => {
  const validation = validateUiThemeManifest(safeParse(ls.get(UI_THEME_CACHE_KEY)));
  return validation.valid ? validation.manifest : null;
};

const cacheTheme = (manifest: UiThemeManifest) => {
  ls.set(UI_THEME_CACHE_KEY, JSON.stringify(manifest));
};

const applyDocumentTheme = (theme: ResolvedUiTheme) => {
  const root = document.documentElement;
  root.dataset.zvTheme = theme.id;
  root.dataset.zvThemeVersion = theme.version;
  root.dataset.zvScheme = theme.color_scheme;
  root.dataset.zvDensity = theme.density;
  root.dataset.zvMotion = theme.motion_preset;
  root.style.colorScheme = theme.color_scheme;
  Object.entries(theme.tokens).forEach(([name, value]) => root.style.setProperty(name, value));
  Object.entries(theme.chart_palette).forEach(([name, value]) => {
    const tokenName = `--zv-chart-${name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`;
    root.style.setProperty(tokenName, value);
  });
};

const applyResolvedTheme = (theme: ResolvedUiTheme, source: ThemeSource) => {
  activeTheme.value = theme;
  naiveThemeOverrides.value = buildNaiveTheme(theme.tokens);
  themeSource.value = source;
  applyDocumentTheme(theme);
  window.dispatchEvent(
    new CustomEvent(UI_THEME_CHANGE_EVENT, {
      detail: {
        id: theme.id,
        version: theme.version,
        colorScheme: theme.color_scheme,
        density: theme.density,
        motionPreset: theme.motion_preset,
        tokenHash: theme.token_hash,
        tokens: theme.tokens,
        chartPalette: theme.chart_palette,
        source,
      },
    }),
  );
  return theme;
};

export const applyUiTheme = (manifest: UiThemeManifest, source: ThemeSource = 'activation') => {
  const theme = resolveUiThemeManifest(manifest);
  if (source === 'activation') window.sessionStorage.removeItem(UI_THEME_PREVIEW_KEY);
  if (source !== 'preview') cacheTheme(manifest);
  return applyResolvedTheme(theme, source);
};

export const previewUiTheme = (manifest: UiThemeManifest) => {
  const validation = validateUiThemeManifest(manifest);
  if (!validation.valid) throw new Error(validation.errors.join('\n'));
  window.sessionStorage.setItem(UI_THEME_PREVIEW_KEY, JSON.stringify(validation.manifest));
  return applyUiTheme(validation.manifest, 'preview');
};

export const clearUiThemePreview = () => {
  window.sessionStorage.removeItem(UI_THEME_PREVIEW_KEY);
  const cached = readCache();
  return cached ? applyUiTheme(cached, 'cache') : applyResolvedTheme(fallbackTheme, 'fallback');
};

export const refreshUiThemeFromServer = async () => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await UiThemeService.getActive({ signal: controller.signal, silent: true });
    if (readPreview()) return activeTheme.value;
    const manifest = normalizeUiThemeManifest(response);
    if (!manifest) throw new Error('active theme manifest is invalid');
    return applyUiTheme(manifest, 'server');
  } catch {
    return activeTheme.value;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const initializeUiTheme = () => {
  const preview = readPreview();
  if (preview) {
    applyUiTheme(preview, 'preview');
    initialized.value = true;
    return activeTheme.value;
  }

  const cached = readCache();
  if (cached) applyUiTheme(cached, 'cache');
  else applyResolvedTheme(fallbackTheme, 'fallback');
  initialized.value = true;

  void refreshUiThemeFromServer();
  return activeTheme.value;
};

export const getActiveUiTheme = () => activeTheme.value;

export const useUiThemeRuntime = () => ({
  activeTheme: readonly(activeTheme),
  naiveThemeOverrides: readonly(naiveThemeOverrides),
  themeSource: readonly(themeSource),
  initialized: readonly(initialized),
});
