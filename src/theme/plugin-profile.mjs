const PROFILE_VALUES = new Set(['standard', 'immersive', 'external']);

export const normalizePluginUiProfile = (value, fallback = 'standard') => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return PROFILE_VALUES.has(normalized) ? normalized : fallback;
};

export const readExplicitHtmlUiProfile = value => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'standard' || normalized === 'immersive' ? normalized : undefined;
};

export const resolveHtmlMenuUiProfile = value => readExplicitHtmlUiProfile(value) || 'immersive';

export const resolveDashboardUiProfile = (type, value) => {
  const fallback = type === 'LINK' ? 'external' : type === 'HTML_PAGE' ? 'immersive' : 'standard';
  return normalizePluginUiProfile(value, fallback);
};
