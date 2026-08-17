<template>
  <button class="brand" type="button" aria-label="返回首页" @click="goHome">
    <span class="brand-mark" aria-hidden="true">
      <span class="brand-core"></span>
    </span>
    <span class="brand-copy">
      <strong>{{ systemInfo?.systemTitle || 'ZenVis' }}</strong>
      <small>Security Operations</small>
    </span>
  </button>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { SystemService } from '@/service/api';
import type { SystemInfo } from '@/types/type-system';

defineOptions({ name: 'NavLogoModern' });

const router = useRouter();
const systemInfo = ref<SystemInfo>();

const loadSystemInfo = async () => {
  try {
    systemInfo.value = await SystemService.getSystemInfo();
  } catch (error) {
    console.error('获取系统信息失败:', error);
  }
};

const goHome = () => router.push({ name: 'dashboard' });

onMounted(loadSystemInfo);
</script>

<style lang="scss" scoped>
.brand {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  width: 240px;
  height: 100%;
  padding: 0 20px;
  color: var(--zv-text);
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.brand-mark {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  overflow: hidden;
  place-items: center;
  background: linear-gradient(145deg, #4f6ef7 8%, #22b8cf 94%);
  border-radius: 13px;
  box-shadow: 0 9px 24px rgba(79, 110, 247, 0.25);
  transform: rotate(-3deg);

  &::before,
  &::after {
    position: absolute;
    content: '';
    border: 1px solid rgba(255, 255, 255, 0.34);
    border-radius: 50%;
  }

  &::before {
    width: 30px;
    height: 30px;
  }

  &::after {
    width: 18px;
    height: 18px;
  }
}

.brand-core {
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(255, 255, 255, 0.9);
}

.brand-copy {
  display: flex;
  min-width: 0;
  margin-left: 11px;
  flex-direction: column;
  line-height: 1.16;

  strong {
    overflow: hidden;
    color: var(--zv-text);
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    margin-top: 4px;
    color: var(--zv-text-muted);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
}

@media (max-width: 1180px) {
  .brand {
    width: 174px;
    padding-inline: 14px;
  }

  .brand-copy small {
    display: none;
  }
}

@media (max-width: 820px) {
  .brand {
    width: 64px;
  }

  .brand-copy {
    display: none;
  }
}
</style>
