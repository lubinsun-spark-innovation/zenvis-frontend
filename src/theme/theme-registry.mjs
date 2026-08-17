import { chartPalette, designTokens } from './design-tokens.mjs';

export const UI_THEME_SCHEMA_VERSION = '1.0';
export const DEFAULT_UI_THEME_ID = 'zenvis-naive-light';
export const COMMAND_UI_THEME_ID = 'zenvis-command-dark';

const freezeManifest = manifest =>
  Object.freeze({
    ...manifest,
    tokens: Object.freeze({ ...manifest.tokens }),
    chart_palette: Object.freeze({ ...manifest.chart_palette }),
  });

export const zenvisNaiveLight = freezeManifest({
  schema_version: UI_THEME_SCHEMA_VERSION,
  id: DEFAULT_UI_THEME_ID,
  name: 'ZenVis Naive Light',
  version: '1.0.0',
  color_scheme: 'light',
  tokens: designTokens,
  chart_palette: chartPalette,
  density: 'compact',
  motion_preset: 'standard',
});

export const zenvisCommandDark = freezeManifest({
  schema_version: UI_THEME_SCHEMA_VERSION,
  id: COMMAND_UI_THEME_ID,
  name: 'ZenVis Command Dark',
  version: '1.0.0',
  color_scheme: 'dark',
  extends: DEFAULT_UI_THEME_ID,
  tokens: {
    '--zv-primary': '#22c55e',
    '--zv-primary-rgb': '34 197 94',
    '--zv-primary-hover': '#4ade80',
    '--zv-primary-pressed': '#16a34a',
    '--zv-primary-soft': 'rgba(34, 197, 94, 0.14)',
    '--zv-cyan': '#2dd4bf',
    '--zv-cyan-rgb': '45 212 191',
    '--zv-cyan-pressed': '#14b8a6',
    '--zv-success': '#22c55e',
    '--zv-success-rgb': '34 197 94',
    '--zv-success-pressed': '#16a34a',
    '--zv-warning': '#f5b942',
    '--zv-warning-rgb': '245 185 66',
    '--zv-danger': '#ff5d68',
    '--zv-danger-rgb': '255 93 104',
    '--zv-danger-pressed': '#e84955',
    '--zv-info': '#4aa8ff',
    '--zv-info-rgb': '74 168 255',
    '--zv-shadow-rgb': '0 0 0',
    '--zv-overlay-rgb': '0 0 0',
    '--zv-bg': '#070b0a',
    '--zv-bg-canvas': '#070b0a',
    '--zv-bg-canvas-rgb': '7 11 10',
    '--zv-bg-elevated': '#121816',
    '--zv-bg-surface': '#101614',
    '--zv-bg-surface-rgb': '16 22 20',
    '--zv-bg-subtle': '#151c19',
    '--zv-bg-muted': '#0c1210',
    '--zv-text': '#f1f7f3',
    '--zv-text-primary': '#f1f7f3',
    '--zv-text-secondary': '#b7c4bb',
    '--zv-text-muted': '#7f9086',
    '--zv-text-tertiary': '#7f9086',
    '--zv-sidebar': '#050807',
    '--zv-sidebar-raised': '#111815',
    '--zv-sidebar-text': '#d3ded6',
    '--zv-border': '#29332f',
    '--zv-border-rgb': '41 51 47',
    '--zv-border-strong': '#3c4943',
    '--zv-divider': '#202925',
    '--zv-header': 'rgba(9, 14, 12, 0.9)',
    '--zv-sidebar-hover': 'rgba(34, 197, 94, 0.1)',
    '--zv-shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.28), 0 8px 22px rgba(0, 0, 0, 0.16)',
    '--zv-shadow-md': '0 18px 46px rgba(0, 0, 0, 0.34)',
    '--zv-shadow-lg': '0 30px 78px rgba(0, 0, 0, 0.48)',
  },
  chart_palette: {
    primary: '#22c55e',
    cyan: '#2dd4bf',
    success: '#22c55e',
    warning: '#f5b942',
    danger: '#ff5d68',
    heading: '#f1f7f3',
    text: '#b7c4bb',
    muted: '#7f9086',
    line: '#3c4943',
    split: '#202925',
    surface: 'transparent',
    pieBorder: '#101614',
  },
  density: 'compact',
  motion_preset: 'command',
});

export const builtinUiThemes = Object.freeze([zenvisNaiveLight, zenvisCommandDark]);

export const getBuiltinUiTheme = id => builtinUiThemes.find(theme => theme.id === id);

export const isBuiltinUiTheme = id => Boolean(getBuiltinUiTheme(id));

const THEME_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DANGEROUS_VALUE_PATTERN =
  /(?:javascript\s*:|(?:https?|data|ftp|file)\s*:|\/\/|expression\s*\(|@import|url\s*\(|(?:var|calc|color-mix|image-set|attr|env)\s*\(|[{};]|<\/?(?:script|style|svg|html))/i;
const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  'schema_version',
  'id',
  'name',
  'version',
  'color_scheme',
  'extends',
  'tokens',
  'chart_palette',
  'density',
  'motion_preset',
]);
const ALLOWED_TOKEN_NAMES = new Set(Object.keys(designTokens));
const ALLOWED_CHART_KEYS = new Set(Object.keys(chartPalette));
const ALLOWED_DENSITIES = new Set(['compact', 'comfortable']);
const ALLOWED_MOTION_PRESETS = new Set(['none', 'subtle', 'standard', 'command']);

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const copyManifest = value => ({
  schema_version: value.schema_version,
  id: value.id,
  name: value.name,
  version: value.version,
  color_scheme: value.color_scheme,
  ...(value.extends ? { extends: value.extends } : {}),
  tokens: { ...(value.tokens || {}) },
  ...(value.chart_palette ? { chart_palette: { ...value.chart_palette } } : {}),
  ...(value.density ? { density: value.density } : {}),
  ...(value.motion_preset ? { motion_preset: value.motion_preset } : {}),
});

export const extractUiThemeManifest = value => {
  if (!isRecord(value)) return value;
  if (isRecord(value.theme)) return extractUiThemeManifest(value.theme);
  if (typeof value.manifest === 'string') {
    try {
      return JSON.parse(value.manifest);
    } catch {
      return value.manifest;
    }
  }
  return isRecord(value.manifest) ? value.manifest : value;
};

export const validateUiThemeManifest = input => {
  const value = extractUiThemeManifest(input);
  const errors = [];
  if (!isRecord(value)) return { valid: false, errors: ['主题必须是 JSON 对象。'] };

  Object.keys(value).forEach(key => {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) errors.push(`不支持的字段：${key}`);
  });
  if (value.schema_version !== UI_THEME_SCHEMA_VERSION) {
    errors.push(`schema_version 必须为 ${UI_THEME_SCHEMA_VERSION}。`);
  }
  if (typeof value.id !== 'string' || !THEME_ID_PATTERN.test(value.id)) {
    errors.push('id 必须使用小写字母、数字和连字符，并以字母开头。');
  }
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 80) {
    errors.push('name 必须是 1-80 个字符。');
  }
  if (typeof value.version !== 'string' || !VERSION_PATTERN.test(value.version)) {
    errors.push('version 必须是语义化版本号。');
  }
  if (value.color_scheme !== 'light' && value.color_scheme !== 'dark') {
    errors.push('color_scheme 只能是 light 或 dark。');
  }
  if (value.extends !== undefined) {
    if (typeof value.extends !== 'string' || !THEME_ID_PATTERN.test(value.extends)) {
      errors.push('extends 必须是合法主题 id。');
    } else if (value.extends === value.id) {
      errors.push('主题不能继承自身。');
    } else if (!isBuiltinUiTheme(value.extends)) {
      errors.push('extends 目前只能引用 ZenVis 内置主题。');
    }
  }
  if (!isRecord(value.tokens)) {
    errors.push('tokens 必须是 JSON 对象。');
  } else {
    Object.entries(value.tokens).forEach(([name, tokenValue]) => {
      if (!ALLOWED_TOKEN_NAMES.has(name)) errors.push(`不支持的 token：${name}`);
      const isCanonicalValue = designTokens[name] === tokenValue;
      if (
        typeof tokenValue !== 'string' ||
        !tokenValue.trim() ||
        tokenValue.length > 240 ||
        (!isCanonicalValue && DANGEROUS_VALUE_PATTERN.test(tokenValue))
      ) {
        errors.push(`token ${name} 的值不安全或无效。`);
      }
    });
  }
  if (value.chart_palette !== undefined) {
    if (!isRecord(value.chart_palette)) {
      errors.push('chart_palette 必须是 JSON 对象。');
    } else {
      Object.entries(value.chart_palette).forEach(([name, paletteValue]) => {
        if (!ALLOWED_CHART_KEYS.has(name)) errors.push(`不支持的图表颜色：${name}`);
        if (
          typeof paletteValue !== 'string' ||
          !paletteValue.trim() ||
          paletteValue.length > 120 ||
          DANGEROUS_VALUE_PATTERN.test(paletteValue)
        ) {
          errors.push(`图表颜色 ${name} 的值不安全或无效。`);
        }
      });
    }
  }
  if (value.density !== undefined && !ALLOWED_DENSITIES.has(value.density)) {
    errors.push('density 只能是 compact 或 comfortable。');
  }
  if (value.motion_preset !== undefined && !ALLOWED_MOTION_PRESETS.has(value.motion_preset)) {
    errors.push('motion_preset 不受支持。');
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [], manifest: copyManifest(value) };
};

const stableStringify = value => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const stableThemeHash = value => {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const resolveUiThemeManifest = input => {
  const validation = validateUiThemeManifest(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }
  const manifest = validation.manifest;
  const base =
    manifest.id === DEFAULT_UI_THEME_ID
      ? zenvisNaiveLight
      : getBuiltinUiTheme(manifest.extends || DEFAULT_UI_THEME_ID) || zenvisNaiveLight;
  const resolved = {
    ...manifest,
    extends: manifest.extends || (manifest.id === DEFAULT_UI_THEME_ID ? undefined : base.id),
    tokens: { ...base.tokens, ...manifest.tokens },
    chart_palette: { ...base.chart_palette, ...(manifest.chart_palette || {}) },
    density: manifest.density || base.density || 'compact',
    motion_preset: manifest.motion_preset || base.motion_preset || 'standard',
    is_builtin: isBuiltinUiTheme(manifest.id),
  };
  return Object.freeze({
    ...resolved,
    tokens: Object.freeze(resolved.tokens),
    chart_palette: Object.freeze(resolved.chart_palette),
    token_hash: stableThemeHash({ tokens: resolved.tokens, chart_palette: resolved.chart_palette }),
  });
};

export const resolveBuiltinUiTheme = id =>
  resolveUiThemeManifest(getBuiltinUiTheme(id) || zenvisNaiveLight);
