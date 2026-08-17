<template>
  <PluginFrame :src="iframeUrl" title="外部应用" profile="external" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import PluginFrame from '@c/plugin-frame.vue';
import { sanitizeIframeUrl } from '@u/url';

const route = useRoute();
const iframeUrl = ref<string>(sanitizeIframeUrl(''));

const getDecodedUrl = (): string => {
  const encodedParam = route.params['menuParams']?.toString() || 'default';
  try {
    return sanitizeIframeUrl(atob(encodedParam));
  } catch (error) {
    console.error('Base64 解码失败:', error);
    return sanitizeIframeUrl('');
  }
};

iframeUrl.value = getDecodedUrl();

watch(
  () => route.params['menuParams'],
  () => {
    iframeUrl.value = getDecodedUrl();
  },
);
</script>
