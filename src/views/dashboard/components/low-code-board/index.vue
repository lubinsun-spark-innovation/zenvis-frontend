<template>
  <PluginFrame :src="iframeUrl" title="低代码看板" profile="standard" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { appBaseUrl, sanitizeIframeUrl } from '@u/url';
import PluginFrame from '@c/plugin-frame.vue';

const props = defineProps({
  data: {
    type: Object,
    default: () => {
      return {};
    },
  },
});

const iframeUrl = computed(() =>
  sanitizeIframeUrl(
    `/amis/page.html?${new URLSearchParams({
      config: props.data?.configIndex || '',
      baseUrl: appBaseUrl,
    }).toString()}`,
  ),
);
</script>
