import {
  DEFAULT_UI_THEME_ID,
  extractUiThemeManifest,
  getBuiltinUiTheme,
  validateUiThemeManifest,
} from './theme-registry.mjs';

const FRONTEND_RESOURCE_PATTERN = /^frontend:\/\/([a-z][a-z0-9-]*)(?:@([^/]+))?$/;

const parseResourceRef = resourceRef => {
  const match =
    typeof resourceRef === 'string' ? resourceRef.match(FRONTEND_RESOURCE_PATTERN) : null;
  return match ? { id: match[1], version: match[2] || '' } : null;
};

export const unwrapUiThemeRecord = input => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  return input.theme && typeof input.theme === 'object' && !Array.isArray(input.theme)
    ? input.theme
    : input;
};

export const normalizeUiThemeManifest = input => {
  const rawInput = unwrapUiThemeRecord(input);
  const raw = rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput) ? rawInput : {};
  const directValidation = validateUiThemeManifest(extractUiThemeManifest(rawInput));
  if (directValidation.valid) return directValidation.manifest;

  const reference = parseResourceRef(raw.resource_ref);
  const themeId = String(raw.code || reference?.id || raw.id || DEFAULT_UI_THEME_ID);
  const base = getBuiltinUiTheme(themeId) || getBuiltinUiTheme(reference?.id || '');
  const candidate = {
    ...(base || {}),
    schema_version: raw.schema_version || base?.schema_version || '1.0',
    id: themeId,
    name: raw.name || base?.name || themeId,
    version: raw.version || reference?.version || base?.version || '1.0.0',
    color_scheme: raw.color_scheme || base?.color_scheme || 'light',
    ...(base && themeId !== base.id ? { extends: base.id } : {}),
    tokens: {
      ...(base?.id === themeId ? base.tokens : {}),
      ...(raw.token_overrides || raw.tokens || {}),
    },
    chart_palette: {
      ...(base?.id === themeId ? base.chart_palette : {}),
      ...(raw.chart_palette || {}),
    },
    density: raw.density || base?.density || 'compact',
    motion_preset: raw.motion_preset || base?.motion_preset || 'standard',
  };
  const validation = validateUiThemeManifest(candidate);
  return validation.valid ? validation.manifest : null;
};
