import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  builtinUiThemes,
  resolveBuiltinUiTheme,
  resolveUiThemeManifest,
  validateUiThemeManifest,
} from './theme-registry.mjs';
import { normalizeUiThemeManifest } from './theme-response.mjs';

const customManifest = (tokens: Record<string, string> = {}) => ({
  schema_version: '1.0',
  id: 'custom-security-theme',
  name: 'Custom security theme',
  version: '1.0.0',
  color_scheme: 'dark',
  extends: 'zenvis-command-dark',
  tokens,
  chart_palette: {},
  density: 'compact',
  motion_preset: 'command',
});

test('内置亮色、暗色与冷静运营主题均合法、完整且具有不同稳定哈希', () => {
  assert.equal(builtinUiThemes.length, 3);
  builtinUiThemes.forEach(manifest => assert.equal(validateUiThemeManifest(manifest).valid, true));

  const light = resolveBuiltinUiTheme('zenvis-naive-light');
  const dark = resolveBuiltinUiTheme('zenvis-command-dark');
  const calm = resolveBuiltinUiTheme('zenvis-calm-operations');
  assert.equal(light.color_scheme, 'light');
  assert.equal(dark.color_scheme, 'dark');
  assert.equal(calm.color_scheme, 'light');
  assert.equal(dark.tokens['--zv-primary'], '#22c55e');
  assert.equal(calm.tokens['--zv-primary'], '#2f5ee5');
  assert.equal(calm.tokens['--zv-text-muted'], '#66758a');
  assert.equal(calm.density, 'comfortable');
  assert.equal(calm.motion_preset, 'subtle');
  assert.notEqual(light.token_hash, dark.token_hash);
  assert.notEqual(light.token_hash, calm.token_hash);

  const changedNestedToken = resolveUiThemeManifest(customManifest({ '--zv-primary': '#16a34a' }));
  assert.notEqual(changedNestedToken.token_hash, dark.token_hash);
});

test('主题 manifest 拒绝可执行 CSS、远程资源和非内置继承', () => {
  const unsafeValues = [
    'var(--foreign-token)',
    'calc(100% - 1px)',
    'color-mix(in srgb, red, blue)',
    'image-set(url(x) 1x)',
    'url(https://example.com/a.png)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'javascript:alert(1)',
    'ftp://example.com/theme.css',
    'file:///etc/passwd',
    '#fff; position: fixed',
    '<svg onload=alert(1)>',
  ];
  unsafeValues.forEach(value => {
    const result = validateUiThemeManifest(customManifest({ '--zv-primary': value }));
    assert.equal(result.valid, false, value);
  });

  assert.equal(
    validateUiThemeManifest({ ...customManifest(), extends: 'some-custom-parent' }).valid,
    false,
  );
});

test('active envelope 与 frontend resource_ref 能解析到内置暗色主题', () => {
  const normalized = normalizeUiThemeManifest({
    scope: 'global',
    activation_version: 7,
    theme: {
      code: 'zenvis-command-dark',
      resource_ref: 'frontend://zenvis-command-dark@1.0.0',
      manifest: {},
      token_overrides: {},
    },
  });
  assert.ok(normalized);
  assert.equal(normalized.id, 'zenvis-command-dark');
  assert.equal(normalized.version, '1.0.0');
  assert.equal(normalized.color_scheme, 'dark');
});

test('内置 Calm Operations resource_ref 优先解析前端完整主题配方', () => {
  const normalized = normalizeUiThemeManifest({
    scope: 'global',
    activation_version: 8,
    theme: {
      code: 'zenvis-calm-operations',
      resource_ref: 'frontend://zenvis-calm-operations@1.0.0',
      manifest: JSON.stringify({
        schema_version: '1.0',
        id: 'zenvis-calm-operations',
        name: 'ZenVis Calm Operations',
        version: '1.0.0',
        color_scheme: 'light',
        extends: 'zenvis-naive-light',
        tokens: {},
      }),
      token_overrides: {},
    },
  });
  assert.ok(normalized);
  assert.equal(normalized.id, 'zenvis-calm-operations');
  assert.equal(normalized.tokens['--zv-primary'], '#2f5ee5');
  assert.equal(normalized.tokens['--zv-text-muted'], '#66758a');
  assert.equal(normalized.density, 'comfortable');
  assert.equal(normalized.motion_preset, 'subtle');
});

test('主题启动使用缓存同步挂载，并在后台刷新 active 接口', async () => {
  const runtimeSource = await readFile(new URL('./theme-runtime.ts', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../main.ts', import.meta.url), 'utf8');

  assert.match(runtimeSource, /export const initializeUiTheme = \(\) =>/);
  assert.match(runtimeSource, /const cached = readCache\(\)/);
  assert.match(runtimeSource, /void refreshUiThemeFromServer\(\)/);
  assert.doesNotMatch(mainSource, /await initializeUiTheme\(\)/);
});
