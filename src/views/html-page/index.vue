<template>
  <PluginFrame :src="iframeUrl" title="可视化页面" :profile="uiProfile" />
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import { sanitizeIframeUrl } from '@u/url';
import PluginFrame from '@c/plugin-frame.vue';
import { resolveHtmlMenuUiProfile } from '@/theme/plugin-profile.mjs';

const route = useRoute();
const iframeUrl = ref<string>(sanitizeIframeUrl('')); // 默认值为 404 页面
const uiProfile = computed(() => {
  const value = route.query.ui_profile;
  return resolveHtmlMenuUiProfile(Array.isArray(value) ? value[0] : value);
});

// 提取路径参数并解码 Base64
function getDecodedUrl(): string {
  // 如果 route.params['menuParams'] 不存在，返回默认值 'default'
  const encodedParam = route.params['menuParams']?.toString() || 'default';
  try {
    // 解码 Base64
    const decodedParam = atob(encodedParam);
    return sanitizeIframeUrl(decodedParam);
  } catch (error) {
    console.error('Base64 解码失败:', error);
    return sanitizeIframeUrl('');
  }
}

// 初始化 iframeUrl
iframeUrl.value = getDecodedUrl();

// 监听路由变化
watch(
  () => route.params['menuParams'], // 只监听 route.params['menuParams'] 的变化
  () => {
    iframeUrl.value = getDecodedUrl();
  },
  { deep: true },
);
</script>
