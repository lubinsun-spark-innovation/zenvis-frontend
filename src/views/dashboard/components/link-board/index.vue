<template>
  <PluginFrame :src="iframeUrl" title="链接看板" :profile="uiProfile" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { sanitizeIframeUrl } from '@u/url';
import PluginFrame from '@c/plugin-frame.vue';
import { resolveDashboardUiProfile } from '@/theme/plugin-frame-contract';

const props = defineProps({
  data: {
    type: Object,
    default: () => {
      return {};
    },
  },
});

const iframeUrl = computed(() => sanitizeIframeUrl(String(props.data?.url || '')));
const uiProfile = computed(() => resolveDashboardUiProfile('LINK', props.data?.uiProfile));
</script>
