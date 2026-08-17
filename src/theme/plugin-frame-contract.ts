import {
  ZENVIS_UI_CONTRACT_VERSION,
  ZENVIS_UI_RENDERER,
  ZENVIS_UI_TOKEN_HASH,
  ZENVIS_UI_TOKENS,
  type PluginUiProfile,
} from './generated/plugin-contract';
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
  tokens: typeof ZENVIS_UI_TOKENS;
  tokenHash: typeof ZENVIS_UI_TOKEN_HASH;
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
): PluginUiPayload => ({
  type: 'zenvis:ui',
  contractVersion: ZENVIS_UI_CONTRACT_VERSION,
  renderer: ZENVIS_UI_RENDERER,
  profile,
  ...environment,
  tokens: ZENVIS_UI_TOKENS,
  tokenHash: ZENVIS_UI_TOKEN_HASH,
  capabilities: Object.freeze([
    'host-navigation',
    'lifecycle-ready',
    'lifecycle-error',
    'standard-token-injection',
  ]),
});
