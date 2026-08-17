import { request } from '@/service/request-wrapper';
import type { UiThemeManifest, UiThemeRecord } from '@/types/type-ui-theme';
import { getBuiltinUiTheme } from '@/theme/theme-registry.mjs';
import { normalizeUiThemeManifest, unwrapUiThemeRecord } from '@/theme/theme-response.mjs';

export { normalizeUiThemeManifest } from '@/theme/theme-response.mjs';

const prefix = '/api/v1/system/ui-theme';

type RawUiThemeRecord = Record<string, unknown> & {
  id?: string | number;
  code?: string;
  name?: string;
  version?: string;
  schema_version?: string;
  color_scheme?: string;
  resource_ref?: string;
  manifest?: unknown;
  theme?: unknown;
  token_overrides?: Record<string, string>;
  tokens?: Record<string, string>;
  chart_palette?: Record<string, string>;
  density?: string;
  motion_preset?: string;
  is_active?: boolean | number;
  active?: boolean | number;
  is_builtin?: boolean | number;
  revision?: number;
  created_at?: string;
  updated_at?: string;
};

export const normalizeUiThemeRecord = (input: unknown): UiThemeRecord | null => {
  const rawInput = unwrapUiThemeRecord(input);
  if (!rawInput || typeof rawInput !== 'object') return null;
  const raw = rawInput as RawUiThemeRecord;
  const manifest = normalizeUiThemeManifest(raw);
  if (!manifest) return null;
  return {
    id: String(raw.id ?? raw.code ?? manifest.id),
    code: String(raw.code || manifest.id),
    manifest,
    is_active: Boolean(raw.is_active ?? raw.active),
    is_builtin: Boolean(raw.is_builtin || getBuiltinUiTheme(manifest.id)),
    resource_ref: raw.resource_ref,
    revision: typeof raw.revision === 'number' ? raw.revision : undefined,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
};

const normalizeThemeList = (response: unknown): UiThemeRecord[] => {
  const raw = response as { rows?: unknown[]; list?: unknown[] } | unknown[];
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.rows)
    ? raw.rows
    : Array.isArray(raw?.list)
    ? raw.list
    : [];
  return rows.map(normalizeUiThemeRecord).filter((item): item is UiThemeRecord => Boolean(item));
};

export class UiThemeService {
  static async getList(): Promise<UiThemeRecord[]> {
    const response = await request<unknown>(`${prefix}/list`, '', 'GET');
    return normalizeThemeList(response);
  }

  static async getActive(
    options: { signal?: AbortSignal; silent?: boolean } = {},
  ): Promise<unknown> {
    return request<unknown>(`${prefix}/active`, '', 'GET', options);
  }

  static async create(manifest: UiThemeManifest): Promise<UiThemeRecord | null> {
    const response = await request<unknown>(prefix, manifest, 'POST');
    return normalizeUiThemeRecord(response);
  }

  static async update(id: string, manifest: UiThemeManifest): Promise<UiThemeRecord | null> {
    const response = await request<unknown>(`${prefix}/${encodeURIComponent(id)}`, manifest, 'PUT');
    return normalizeUiThemeRecord(response);
  }

  static async activate(id: string): Promise<UiThemeRecord | null> {
    const response = await request<unknown>(
      `${prefix}/${encodeURIComponent(id)}/activate`,
      {},
      'POST',
    );
    return normalizeUiThemeRecord(response);
  }

  static async delete(id: string): Promise<void> {
    await request<void>(`${prefix}/${encodeURIComponent(id)}`, {}, 'DELETE');
  }
}
