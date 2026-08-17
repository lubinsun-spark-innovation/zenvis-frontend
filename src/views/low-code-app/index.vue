<template>
  <PluginFrame :src="iframeUrl" title="低代码应用" profile="standard" />
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import { appBaseUrl, sanitizeIframeUrl } from '@u/url';
import PluginFrame from '@c/plugin-frame.vue';
const route = useRoute();
const baseUrl = ref<string>('/amis/app.html');
const DEFAULT_APP_ROUTE = '/index';
// 提取路径参数并转换为字符串
function getConfigType(): string {
  // 如果 route.params['menuParams'] 不存在，返回默认值 'default'
  return route.params['menuParams']?.toString() || 'default';
}

const buildIframeUrl = () => {
  const params = new URLSearchParams({
    config: getConfigType(),
    baseUrl: appBaseUrl,
  });
  const requestedPage = Array.isArray(route.query.page) ? route.query.page[0] : route.query.page;
  const appRoute =
    typeof requestedPage === 'string' && /^\/[a-zA-Z0-9_/?=&.%:-]*$/.test(requestedPage)
      ? requestedPage
      : DEFAULT_APP_ROUTE;
  const appQuery = new URLSearchParams();
  Object.entries(route.query).forEach(([key, value]) => {
    if (key === 'page' || value === undefined || value === null) return;
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (normalizedValue !== undefined && normalizedValue !== null) {
      appQuery.set(key, String(normalizedValue));
    }
  });
  const appLocation = `${appRoute}${appQuery.size ? `?${appQuery.toString()}` : ''}`;
  return sanitizeIframeUrl(`${baseUrl.value}?${params.toString()}#${appLocation}`);
};

// 初始化 iframeUrl
const iframeUrl = ref<string>(buildIframeUrl());

// 监听路由变化
watch(
  () => [route.params['menuParams'], route.query],
  () => {
    iframeUrl.value = buildIframeUrl();
  },
  { deep: true },
);
</script>
