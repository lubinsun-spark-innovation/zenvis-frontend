import type { PluginUiProfile } from './generated/plugin-contract';

export function normalizePluginUiProfile(
  value: unknown,
  fallback?: PluginUiProfile,
): PluginUiProfile;

export function readExplicitHtmlUiProfile(
  value: unknown,
): Extract<PluginUiProfile, 'standard' | 'immersive'> | undefined;

export function resolveHtmlMenuUiProfile(
  value: unknown,
): Extract<PluginUiProfile, 'standard' | 'immersive'>;

export function resolveDashboardUiProfile(type: string, value?: unknown): PluginUiProfile;
