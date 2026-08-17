import type {
  ResolvedUiTheme,
  UiThemeManifest,
  UiThemeValidationResult,
} from '@/types/type-ui-theme';

export const UI_THEME_SCHEMA_VERSION: '1.0';
export const DEFAULT_UI_THEME_ID: 'zenvis-naive-light';
export const COMMAND_UI_THEME_ID: 'zenvis-command-dark';
export const zenvisNaiveLight: Readonly<UiThemeManifest>;
export const zenvisCommandDark: Readonly<UiThemeManifest>;
export const builtinUiThemes: readonly Readonly<UiThemeManifest>[];

export function getBuiltinUiTheme(id: string): Readonly<UiThemeManifest> | undefined;
export function isBuiltinUiTheme(id: string): boolean;
export function extractUiThemeManifest(value: unknown): unknown;
export function validateUiThemeManifest(input: unknown): UiThemeValidationResult;
export function resolveUiThemeManifest(input: unknown): Readonly<ResolvedUiTheme>;
export function resolveBuiltinUiTheme(id?: string): Readonly<ResolvedUiTheme>;
