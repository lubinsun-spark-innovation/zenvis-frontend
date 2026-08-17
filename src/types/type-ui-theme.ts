export type UiThemeColorScheme = 'light' | 'dark';

export type UiThemeDensity = 'compact' | 'comfortable';

export type UiThemeMotionPreset = 'none' | 'subtle' | 'standard' | 'command';

export type UiThemeManifest = {
  schema_version: '1.0';
  id: string;
  name: string;
  version: string;
  color_scheme: UiThemeColorScheme;
  extends?: string;
  tokens: Record<string, string>;
  chart_palette?: Record<string, string>;
  density?: UiThemeDensity;
  motion_preset?: UiThemeMotionPreset;
};

export type ResolvedUiTheme = UiThemeManifest & {
  tokens: Record<string, string>;
  chart_palette: Record<string, string>;
  density: UiThemeDensity;
  motion_preset: UiThemeMotionPreset;
  token_hash: string;
  is_builtin: boolean;
};

export type UiThemeRecord = {
  id: string;
  code: string;
  manifest: UiThemeManifest;
  is_active: boolean;
  is_builtin: boolean;
  resource_ref?: string;
  revision?: number;
  created_at?: string;
  updated_at?: string;
};

export type UiThemeValidationResult =
  | { valid: true; manifest: UiThemeManifest; errors: [] }
  | { valid: false; errors: string[] };
