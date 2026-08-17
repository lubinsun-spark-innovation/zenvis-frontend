<template>
  <section
    class="plugin-frame"
    :class="`is-${profile}`"
    :data-ui-profile="profile"
    :aria-busy="status === 'loading'"
  >
    <Transition name="plugin-loading">
      <div v-if="status === 'loading'" class="plugin-frame__loading">
        <NSpin size="large" />
        <div class="plugin-frame__loading-copy">
          <strong>正在载入{{ title || '应用' }}</strong>
          <span>正在同步菜单、权限与页面配置</span>
        </div>
      </div>
    </Transition>

    <div v-if="status === 'error'" class="plugin-frame__error" role="alert">
      <strong>{{ title || '插件页面' }}载入失败</strong>
      <span>{{ errorMessage }}</span>
      <NButton type="primary" secondary @click="retry">重新载入</NButton>
    </div>

    <iframe
      ref="frameRef"
      :key="`${iframeSrc}:${profile}:${reloadKey}`"
      :src="iframeSrc"
      :title="title || 'ZenVis 插件应用'"
      class="plugin-frame__iframe"
      :class="{ 'is-ready': status === 'ready' }"
      allow="fullscreen"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      referrerpolicy="no-referrer"
      @load="handleLoad"
      @error="handleFrameError"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NSpin } from 'naive-ui';

import { buildPluginUiPayload, normalizePluginUiProfile } from '@/theme/plugin-frame-contract';
import { UI_THEME_CHANGE_EVENT } from '@/theme/theme-runtime';
import {
  ZENVIS_UI_CONTRACT_VERSION,
  ZENVIS_UI_RENDERER,
  type PluginUiProfile,
} from '@/theme/generated/plugin-contract';

type PluginNavigationMessage = {
  type: 'zenvis:navigate';
  to: string;
};

type PluginLifecycleMessage = {
  type: 'zenvis:plugin-ready' | 'zenvis:plugin-error';
  contractVersion?: string;
  renderer?: string;
  version?: string;
  contract?: string;
  reason?: string;
};

type PluginRuntimeDescriptor = Pick<
  PluginLifecycleMessage,
  'contractVersion' | 'renderer' | 'version' | 'contract'
>;

const LOAD_TIMEOUT_MS = 12_000;
const LEGACY_UI_SCHEMA_VERSION = '1';
const ALLOWED_PLUGIN_ROUTE_PREFIXES = [
  '/service/low-code-app/',
  '/service/low-code-page/',
  '/retrieval/',
];

const props = withDefaults(
  defineProps<{
    src: string;
    title?: string;
    profile?: PluginUiProfile;
  }>(),
  {
    title: '',
    profile: 'standard',
  },
);

const router = useRouter();
const status = ref<'loading' | 'ready' | 'error'>('loading');
const errorMessage = ref('');
const frameRef = ref<HTMLIFrameElement | null>(null);
const frameLoaded = ref(false);
const lifecycleFailed = ref(false);
const readyReceived = ref(false);
const reloadKey = ref(0);
const iframeSrc = computed(() => props.src);
const profile = computed(() => normalizePluginUiProfile(props.profile));
let timeoutId: number | undefined;

const clearLoadTimeout = () => {
  if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  timeoutId = undefined;
};

const markReady = () => {
  if (lifecycleFailed.value) return;
  clearLoadTimeout();
  status.value = 'ready';
  errorMessage.value = '';
};

const markError = (message: string) => {
  lifecycleFailed.value = true;
  clearLoadTimeout();
  status.value = 'error';
  errorMessage.value = message;
};

const startLoading = () => {
  clearLoadTimeout();
  frameLoaded.value = false;
  lifecycleFailed.value = false;
  readyReceived.value = false;
  status.value = 'loading';
  errorMessage.value = '';
  timeoutId = window.setTimeout(() => {
    markError('插件未在 12 秒内完成 UI 契约握手，请检查资源地址或契约版本。');
  }, LOAD_TIMEOUT_MS);
};

const targetOrigin = () => new URL(props.src, window.location.origin).origin;

const createPayload = () =>
  buildPluginUiPayload(profile.value, {
    locale: document.documentElement.lang || navigator.language || 'zh-CN',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    density: window.matchMedia('(pointer: coarse)').matches ? 'comfortable' : 'compact',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

const syncIframeUi = () => {
  const frame = frameRef.value;
  if (!frame?.contentWindow) return;
  const payload = createPayload();

  if (profile.value === 'standard' && targetOrigin() === window.location.origin) {
    try {
      const root = frame.contentDocument?.documentElement;
      if (root) {
        root.dataset.zenvisUi = ZENVIS_UI_CONTRACT_VERSION;
        root.dataset.zenvisProfile = 'standard';
        root.dataset.zenvisTheme = payload.themeId;
        root.dataset.zenvisThemeVersion = payload.themeVersion;
        root.dataset.zenvisScheme = payload.colorScheme;
        root.dataset.zenvisDensity = payload.density;
        root.dataset.zenvisMotion = payload.motionPreset;
        root.style.colorScheme = payload.colorScheme;
        Object.entries(payload.tokens).forEach(([name, value]) => {
          root.style.setProperty(name, value);
        });
      }
    } catch {
      // Cross-origin standard frames receive the same values through postMessage.
    }
  }

  frame.contentWindow.postMessage(payload, targetOrigin());
};

const handleThemeChange = () => {
  if (profile.value === 'standard') syncIframeUi();
};

const isPluginNavigationMessage = (value: unknown): value is PluginNavigationMessage => {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<PluginNavigationMessage>;
  return message.type === 'zenvis:navigate' && typeof message.to === 'string';
};

const isPluginLifecycleMessage = (value: unknown): value is PluginLifecycleMessage => {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<PluginLifecycleMessage>;
  return message.type === 'zenvis:plugin-ready' || message.type === 'zenvis:plugin-error';
};

const normalizePluginRuntime = (descriptor: PluginRuntimeDescriptor) => {
  if (
    descriptor.contractVersion === ZENVIS_UI_CONTRACT_VERSION &&
    descriptor.renderer === ZENVIS_UI_RENDERER
  ) {
    return {
      contractVersion: descriptor.contractVersion,
      renderer: descriptor.renderer,
    };
  }
  if (
    descriptor.version === ZENVIS_UI_CONTRACT_VERSION &&
    descriptor.contract === LEGACY_UI_SCHEMA_VERSION
  ) {
    return {
      contractVersion: descriptor.version,
      renderer: ZENVIS_UI_RENDERER,
    };
  }
  return null;
};

const acceptPluginReady = (descriptor: PluginRuntimeDescriptor) => {
  if (lifecycleFailed.value) return;
  if (!normalizePluginRuntime(descriptor)) {
    markError(`插件 UI 契约不兼容：需要 ${ZENVIS_UI_CONTRACT_VERSION} / ${ZENVIS_UI_RENDERER}。`);
    return;
  }
  readyReceived.value = true;
  if (frameLoaded.value) markReady();
};

const detectSameOriginRuntime = () => {
  if (targetOrigin() !== window.location.origin) return false;
  try {
    const frameWindow = frameRef.value?.contentWindow as
      | (Window & { ZenVisPluginUI?: PluginRuntimeDescriptor })
      | null
      | undefined;
    if (!frameWindow?.ZenVisPluginUI) return false;
    acceptPluginReady(frameWindow.ZenVisPluginUI);
    return true;
  } catch {
    return false;
  }
};

const handleFrameMessage = (event: MessageEvent) => {
  const frameWindow = frameRef.value?.contentWindow;
  if (!frameWindow || event.source !== frameWindow || event.origin !== targetOrigin()) return;

  if (isPluginNavigationMessage(event.data)) {
    const target = event.data.to.trim();
    if (ALLOWED_PLUGIN_ROUTE_PREFIXES.some(prefix => target.startsWith(prefix))) {
      void router.push(target);
    }
    return;
  }

  if (!isPluginLifecycleMessage(event.data)) return;
  if (event.data.type === 'zenvis:plugin-error') {
    markError(event.data.reason || '插件报告了未知运行时错误。');
    return;
  }
  acceptPluginReady(event.data);
};

const handleLoad = () => {
  frameLoaded.value = true;
  if (lifecycleFailed.value) return;
  syncIframeUi();
  if (profile.value !== 'standard') {
    markReady();
    return;
  }
  if (readyReceived.value) {
    markReady();
    return;
  }
  detectSameOriginRuntime();
};

const handleFrameError = () => markError('浏览器无法载入插件资源。');

const retry = () => {
  reloadKey.value += 1;
  startLoading();
};

watch(
  () => [iframeSrc.value, profile.value],
  () => {
    reloadKey.value += 1;
    startLoading();
  },
);

onMounted(() => {
  window.addEventListener('message', handleFrameMessage);
  window.addEventListener(UI_THEME_CHANGE_EVENT, handleThemeChange);
  startLoading();
});
onBeforeUnmount(() => {
  window.removeEventListener('message', handleFrameMessage);
  window.removeEventListener(UI_THEME_CHANGE_EVENT, handleThemeChange);
  clearLoadTimeout();
});
</script>

<style scoped lang="scss">
.plugin-frame {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: radial-gradient(circle at 10% 0%, rgb(var(--zv-primary-rgb) / 8%), transparent 28%),
    var(--zv-bg-canvas);
  isolation: isolate;

  &.is-immersive,
  &.is-external {
    background: transparent;
  }
}

.plugin-frame__iframe {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  opacity: 0;
  transition: opacity 220ms var(--zv-ease-out);

  &.is-ready {
    opacity: 1;
  }
}

.plugin-frame__loading,
.plugin-frame__error {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: var(--zv-text-primary);
  background: rgb(var(--zv-bg-canvas-rgb) / 88%);
  backdrop-filter: blur(12px);
}

.plugin-frame__loading-copy,
.plugin-frame__error {
  display: grid;
  gap: 8px;
  text-align: center;
}

.plugin-frame__loading-copy {
  text-align: left;
}

.plugin-frame__loading-copy strong,
.plugin-frame__error strong {
  font-size: 15px;
  font-weight: 650;
}

.plugin-frame__loading-copy span,
.plugin-frame__error span {
  max-width: 520px;
  color: var(--zv-text-tertiary);
  font-size: 12px;
}

.plugin-loading-leave-active {
  transition: opacity 260ms ease;
}

.plugin-loading-leave-to {
  opacity: 0;
}
</style>
