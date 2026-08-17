import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  designTokens,
  elementTokens,
  naiveTokens,
  pluginClasses,
  uiContract,
} from './design-tokens.mjs';
import {
  normalizePluginUiProfile,
  readExplicitHtmlUiProfile,
  resolveDashboardUiProfile,
  resolveHtmlMenuUiProfile,
} from './plugin-profile.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');

test('canonical tokens deterministically feed host, Element, Naive, plugin, and charts', () => {
  const host = read('src/assets/styles/generated/design-tokens.scss');
  const element = read('src/assets/styles/generated/element-tokens.scss');
  const naive = read('src/theme/generated/naive-theme.ts');
  const plugin = read('public/amis/plugin-ui/v1/zenvis-plugin-tokens.css');
  const chart = read('public/amis/plugin-ui/v1/zenvis-plugin-chart-palette.js');

  Object.entries(designTokens).forEach(([name, value]) => {
    const declaration = `${name}: ${value};`;
    assert.ok(host.includes(declaration), `host token drift: ${name}`);
    assert.ok(plugin.includes(declaration), `plugin token drift: ${name}`);
  });
  Object.entries(elementTokens).forEach(([name, value]) => {
    assert.ok(element.includes(`${name}: ${value};`), `Element token drift: ${name}`);
  });
  Object.entries(naiveTokens).forEach(([name, value]) => {
    assert.ok(naive.includes(`"${name}": "${value}"`), `Naive token drift: ${name}`);
  });
  ['primary', 'success', 'warning', 'danger', 'heading', 'text'].forEach(name => {
    assert.match(chart, new RegExp(`"${name}"\\s*:`));
  });
});

test('public plugin styles expose only the frozen generic classes', () => {
  const adapter = read('public/amis/plugin-ui/v1/zenvis-amis-adapter.css');
  const sources = [read('public/amis/plugin-ui/v1/zenvis-plugin-ui.css'), adapter];
  const actual = new Set(
    sources.flatMap(source =>
      Array.from(source.matchAll(/\.((?:zv-)[a-zA-Z0-9_-]+)/g), match => match[1]),
    ),
  );

  assert.deepEqual([...actual].sort(), [...pluginClasses].sort());
  assert.doesNotMatch(sources.join('\n'), /soc-|lubinsun-/i);
  assert.doesNotMatch(
    adapter,
    /#[0-9a-f]{3,8}\b|rgba?\(\s*\d/i,
    'AMIS adapter palette literals must come from canonical --zv-* tokens',
  );
});

test('profile resolution and handshake payload preserve explicit container ownership', () => {
  assert.equal(normalizePluginUiProfile('STANDARD'), 'standard');
  assert.equal(normalizePluginUiProfile('unknown', 'immersive'), 'immersive');
  assert.equal(resolveDashboardUiProfile('LOW_CODE_PAGE'), 'standard');
  assert.equal(resolveDashboardUiProfile('HTML_PAGE'), 'immersive');
  assert.equal(resolveDashboardUiProfile('LINK'), 'external');
  assert.equal(resolveDashboardUiProfile('HTML_PAGE', 'STANDARD'), 'standard');

  assert.equal(readExplicitHtmlUiProfile('STANDARD'), 'standard');
  assert.equal(readExplicitHtmlUiProfile('IMMERSIVE'), 'immersive');
  assert.equal(readExplicitHtmlUiProfile('LEGACY_UNSPECIFIED'), undefined);
  assert.equal(resolveHtmlMenuUiProfile('STANDARD'), 'standard');
  assert.equal(resolveHtmlMenuUiProfile(undefined), 'immersive');

  const modernNavigation = read('src/components/layout/components/nav-menu-modern.vue');
  const legacyNavigation = read('src/components/layout/components/nav-menu.vue');
  const htmlPage = read('src/views/html-page/index.vue');
  assert.match(modernNavigation, /item\.ui_profile \?\? item\.uiProfile/);
  assert.match(legacyNavigation, /item\.ui_profile \?\? item\.uiProfile/);
  assert.match(htmlPage, /route\.query\.ui_profile/);
  assert.match(htmlPage, /resolveHtmlMenuUiProfile/);

  const payloadBuilder = read('src/theme/plugin-frame-contract.ts');
  assert.match(payloadBuilder, /ZENVIS_UI_CONTRACT_VERSION/);
  assert.match(payloadBuilder, /getActiveUiTheme/);
  assert.match(payloadBuilder, /themeId: theme\.id/);
  assert.match(payloadBuilder, /chartPalette: theme\.chart_palette/);
  assert.match(payloadBuilder, /lifecycle-error/);
  assert.match(payloadBuilder, /theme-update/);
});

test('PluginFrame injects standard tokens only and closes ready/error/timeout lifecycle', () => {
  const frame = read('src/components/plugin-frame.vue');
  const payloadBuilder = read('src/theme/plugin-frame-contract.ts');
  assert.match(frame, /profile\.value === 'standard'/);
  assert.match(frame, /profile\.value !== 'standard'/);
  assert.match(frame, /zenvis:plugin-ready/);
  assert.match(frame, /zenvis:plugin-error/);
  assert.match(frame, /LOAD_TIMEOUT_MS = 12_000/);
  assert.match(frame, /payload\.tokens/);
  assert.match(frame, /zenvisThemeVersion = payload\.themeVersion/);
  assert.match(frame, /zenvisDensity = payload\.density/);
  assert.match(frame, /zenvisMotion = payload\.motionPreset/);
  assert.match(frame, /const lifecycleFailed = ref\(false\)/);
  assert.match(frame, /const readyReceived = ref\(false\)/);
  assert.match(frame, /const markError[\s\S]*?lifecycleFailed\.value = true/);
  assert.match(frame, /const startLoading[\s\S]*?lifecycleFailed\.value = false/);
  assert.match(frame, /const startLoading[\s\S]*?readyReceived\.value = false/);
  assert.match(frame, /const handleLoad[\s\S]*?if \(lifecycleFailed\.value\) return/);
  assert.match(frame, /descriptor\.contract === LEGACY_UI_SCHEMA_VERSION/);
  assert.match(frame, /frameWindow\?\.ZenVisPluginUI/);
  assert.match(frame, /const acceptPluginReady[\s\S]*?readyReceived\.value = true/);
  assert.match(frame, /const handleLoad[\s\S]*?if \(readyReceived\.value\)/);
  assert.match(frame, /UI_THEME_CHANGE_EVENT/);
  assert.match(frame, /handleThemeChange[\s\S]*?profile\.value === 'standard'/);

  const lifecycleGuard = frame.indexOf('if (!isPluginLifecycleMessage(event.data)) return;');
  const earlyError = frame.indexOf("if (event.data.type === 'zenvis:plugin-error')");
  const acceptReady = frame.indexOf('acceptPluginReady(event.data);');
  assert.ok(
    lifecycleGuard >= 0 && lifecycleGuard < earlyError && earlyError < acceptReady,
    'valid lifecycle errors must latch before accepting early ready messages',
  );
  assert.match(
    frame,
    /event\.source !== frameWindow \|\| event\.origin !== targetOrigin\(\)/,
    'early errors still require the current iframe source and exact origin',
  );
  assert.match(payloadBuilder, /tokenHash/);
  assert.match(payloadBuilder, /capabilities/);
});

test('AMIS entry points load the complete versioned adapter before rendering', () => {
  ['public/amis/app.html', 'public/amis/page.html'].forEach(path => {
    const source = read(path);
    const tokens = source.indexOf('plugin-ui/v1/zenvis-plugin-tokens.css');
    const kit = source.indexOf('plugin-ui/v1/zenvis-plugin-ui.css');
    const adapter = source.indexOf('plugin-ui/v1/zenvis-amis-adapter.css');
    const palette = source.indexOf('plugin-ui/v1/zenvis-plugin-chart-palette.js');
    const chart = source.indexOf('plugin-ui/v1/zenvis-plugin-chart.js');
    assert.ok(tokens >= 0 && tokens < kit && kit < adapter, `CSS order drift in ${path}`);
    assert.ok(palette >= 0 && palette < chart, `chart order drift in ${path}`);
    assert.doesNotMatch(source, /zenvis-modern\.css/);
  });
  assert.equal(existsSync(resolve(repositoryRoot, 'public/amis/zenvis-modern.css')), false);
});

test('runtime and browser fixture implement the versioned host handshake', () => {
  const runtime = read('public/amis/plugin-ui/v1/zenvis-plugin-ui.js');
  const fixture = read('public/amis/plugin-ui/v1/contract-fixture.html');
  assert.ok(runtime.includes(`CONTRACT_VERSION = '${uiContract.contractVersion}'`));
  assert.match(runtime, /CONTRACT_VERSION = '1\.0\.0'/);
  assert.match(runtime, /RENDERER = 'amis@6\.7'/);
  assert.match(runtime, /normalizeProfile/);
  assert.match(runtime, /profile\) !== 'standard'/);
  assert.match(runtime, /trustedHostOrigin = event\.origin/);
  assert.match(runtime, /zenvis:plugin-ready/);
  assert.match(runtime, /context\.colorScheme \|\| 'light'/);
  assert.match(runtime, /context\.themeVersion \|\| '1\.0\.0'/);
  assert.match(runtime, /context\.density \|\| 'compact'/);
  assert.match(runtime, /context\.motionPreset \|\| 'standard'/);
  assert.match(runtime, /zenvis:theme-update/);
  assert.match(runtime, /chartPalette/);
  assert.match(runtime, /zenvis:plugin-error/);
  assert.match(fixture, /zenvis:ui-sync/);
  pluginClasses.forEach(name => assert.ok(fixture.includes(name), `fixture misses ${name}`));
});

test('host application resolves light and dark themes while immersive content remains isolated', () => {
  const sources = [
    'src/App.vue',
    'src/assets/styles/design-system.scss',
    'src/components/layout/components/nav-menu-modern.vue',
    'src/stores/modules/app.ts',
    'src/theme/naive-theme.ts',
    'src/views/policy/components/rightEdit.vue',
  ].map(read);
  assert.equal(existsSync(resolve(repositoryRoot, 'src/composables/use-theme-mode.ts')), false);
  const source = sources.join('\n');
  assert.match(source, /darkTheme/);
  assert.match(read('src/theme/theme-registry.mjs'), /zenvis-command-dark/);
  assert.match(read('src/theme/theme-runtime.ts'), /zenvis:theme-change/);
  assert.doesNotMatch(source, /useThemeMode|vs-dark|切换为深色模式/);
});

test('starter templates are present and the AMIS template is valid JSON', () => {
  const amisTemplate = read('doc/plugin-ui/templates/amis-dashboard.json');
  const htmlTemplate = read('doc/plugin-ui/templates/html-page.html');
  assert.doesNotThrow(() => JSON.parse(amisTemplate));
  assert.match(amisTemplate, /zv-metric-card/);
  assert.match(htmlTemplate, /ZenVisPluginUI\.onReady/);
});
