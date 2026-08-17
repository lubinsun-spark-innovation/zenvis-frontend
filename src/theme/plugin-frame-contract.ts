import {
  ZENVIS_UI_CONTRACT_VERSION,
  ZENVIS_UI_RENDERER,
  type PluginUiProfile,
} from './generated/plugin-contract';
import { getActiveUiTheme } from './theme-runtime';
export { normalizePluginUiProfile, resolveDashboardUiProfile } from './plugin-profile.mjs';
import { normalizePluginUiProfile } from './plugin-profile.mjs';

export type PluginUiPayload = {
  type: 'zenvis:ui';
  contractVersion: typeof ZENVIS_UI_CONTRACT_VERSION;
  renderer: typeof ZENVIS_UI_RENDERER;
  profile: PluginUiProfile;
  locale: string;
  timezone: string;
  density: 'comfortable' | 'compact';
  reducedMotion: boolean;
  themeId: string;
  themeVersion: string;
  colorScheme: 'light' | 'dark';
  motionPreset: string;
  tokens: Readonly<Record<string, string>>;
  chartPalette: Readonly<Record<string, string>>;
  tokenHash: string;
  capabilities: readonly string[];
};

export const buildPluginUiPayload = (
  profile: PluginUiProfile,
  environment: {
    locale: string;
    timezone: string;
    density: 'comfortable' | 'compact';
    reducedMotion: boolean;
  },
): PluginUiPayload => {
  const theme = getActiveUiTheme();
  return {
    type: 'zenvis:ui',
    contractVersion: ZENVIS_UI_CONTRACT_VERSION,
    renderer: ZENVIS_UI_RENDERER,
    profile,
    ...environment,
    density: theme.density,
    reducedMotion: environment.reducedMotion || theme.motion_preset === 'none',
    themeId: theme.id,
    themeVersion: theme.version,
    colorScheme: theme.color_scheme,
    motionPreset: theme.motion_preset,
    tokens: theme.tokens,
    chartPalette: theme.chart_palette,
    tokenHash: theme.token_hash,
    capabilities: Object.freeze([
      'host-navigation',
      'lifecycle-ready',
      'lifecycle-error',
      'standard-token-injection',
      'theme-update',
    ]),
  };
};
