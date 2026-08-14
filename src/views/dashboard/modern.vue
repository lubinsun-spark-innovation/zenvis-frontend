<template>
  <section class="dashboard-modern">
    <div v-if="dashboardMenuAuthorized" class="dashboard-toolbar">
      <n-button
        v-if="canSwitchDashboard"
        class="dashboard-picker"
        type="primary"
        round
        @click="openDashboardPicker"
      >
        <template #icon
          ><n-icon><Menu /></n-icon
        ></template>
        切换看板
      </n-button>

      <div v-if="currentDashboard" class="dashboard-current">
        <span class="dashboard-current__icon">
          <n-icon><component :is="dashboardIcon(currentDashboard.type)" /></n-icon>
        </span>
        <span>
          <small>{{
            currentDashboard.typeDescription || dashboardTypeLabel(currentDashboard.type)
          }}</small>
          <strong>{{ currentDashboard.name }}</strong>
        </span>
      </div>
    </div>

    <n-drawer v-if="canSwitchDashboard" v-model:show="drawerVisible" placement="left" :width="336">
      <n-drawer-content closable :native-scrollbar="false">
        <template #header>
          <div class="drawer-title">
            <span class="drawer-title__mark"
              ><n-icon><DataBoard /></n-icon
            ></span>
            <span><strong>看板中心</strong><small>选择你关注的运营视图</small></span>
          </div>
        </template>

        <n-skeleton v-if="loading" text :repeat="5" class="dashboard-skeleton" />
        <n-empty v-else-if="!dashboardListData.length" description="暂无可用看板" />
        <div v-else class="dashboard-list">
          <button
            v-for="item in dashboardListData"
            :key="item.id"
            type="button"
            class="dashboard-option"
            :class="{ 'is-active': isCurrentDashboard(item) }"
            @click="setDashboard(item)"
          >
            <span class="dashboard-option__icon">
              <n-icon :size="19"><component :is="dashboardIcon(item.type)" /></n-icon>
            </span>
            <span class="dashboard-option__copy">
              <span>
                <strong>{{ item.name }}</strong>
                <em v-if="item.isDefault">默认</em>
              </span>
              <small>{{ item.typeDescription || dashboardTypeLabel(item.type) }}</small>
            </span>
            <n-icon class="dashboard-option__arrow"><ArrowRight /></n-icon>
          </button>
        </div>

        <template #footer>
          <div class="drawer-footer">
            <span><i></i> 看板配置已与平台同步</span>
            <n-button quaternary circle :loading="loading" @click="getDashboardList">
              <template #icon
                ><n-icon><Refresh /></n-icon
              ></template>
            </n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <transition name="board-switch" mode="out-in">
      <div :key="currentDashboard?.id || 'empty'" class="dashboard-canvas">
        <LinkBoard v-if="currentDashboard?.type === 'LINK'" :data="currentDashboard" />
        <LowCodeBoard
          v-else-if="currentDashboard?.type === 'LOW_CODE_PAGE'"
          :data="currentDashboard"
        />
        <HtmlBoard v-else-if="currentDashboard?.type === 'HTML_PAGE'" :data="currentDashboard" />
        <component
          :is="currentBuiltInDashboard"
          v-else-if="currentDashboard?.type === 'BUILT' && currentBuiltInDashboard"
          :data="currentDashboard"
        />
        <n-empty
          v-else-if="currentDashboard?.type === 'BUILT'"
          class="dashboard-empty"
          description="内置看板不存在或尚未配置"
        />
        <div v-else-if="loading" class="dashboard-loading">
          <n-skeleton height="100%" width="100%" />
        </div>
        <n-empty v-else class="dashboard-empty" description="暂无可展示的看板">
          <template v-if="canSwitchDashboard" #extra>
            <n-button type="primary" @click="openDashboardPicker">选择看板</n-button>
          </template>
        </n-empty>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NDrawer, NDrawerContent, NEmpty, NIcon, NSkeleton } from 'naive-ui';
import {
  ArrowRight,
  DataBoard,
  Document,
  Link,
  Menu,
  Monitor,
  Refresh,
} from '@element-plus/icons-vue';

import HtmlBoard from './components/html-board/index.vue';
import LinkBoard from './components/link-board/index.vue';
import LowCodeBoard from './components/low-code-board/index.vue';
import SystemBoard from './components/system-board/index.vue';
import { SystemService } from '@/service/api';
import type { Dashboard } from '@/types/type-system';
import { getPermissionList } from '@u/auth-session';

defineOptions({ name: 'ModernDashboard' });

type DashboardPermissionItem = {
  route?: string;
  params?: string;
  children?: DashboardPermissionItem[];
};

const hasDashboardMenuPermission = (permissions: DashboardPermissionItem[]): boolean =>
  permissions.some(
    permission =>
      permission.route === 'dashboard' || hasDashboardMenuPermission(permission.children || []),
  );

const permissionList = getPermissionList<DashboardPermissionItem[]>() || [];
const dashboardMenuAuthorized = hasDashboardMenuPermission(permissionList);
const authorizedDashboardSources = new Set<string>();

const collectAuthorizedDashboardSources = (permissions: DashboardPermissionItem[]) => {
  permissions.forEach(permission => {
    const params = permission.params || '';
    if (params.endsWith('.app')) {
      authorizedDashboardSources.add(params.slice(0, -4));
    }
    collectAuthorizedDashboardSources(permission.children || []);
  });
};

collectAuthorizedDashboardSources(permissionList);

const builtInDashboardMap: Record<string, Component> = {
  'system-board': SystemBoard,
  'msg-board': SystemBoard,
};

const dashboardIcons: Record<string, Component> = {
  BUILT: Monitor,
  LINK: Link,
  LOW_CODE_PAGE: DataBoard,
  HTML_PAGE: Document,
};

const route = useRoute();
const router = useRouter();
const drawerVisible = ref(false);
const loading = ref(false);
const dashboardListData = ref<Dashboard[]>([]);
const currentDashboard = ref<Dashboard | null>(null);
const canSwitchDashboard = computed(
  () => dashboardMenuAuthorized && dashboardListData.value.length > 1,
);
const currentBuiltInDashboard = computed(
  () => builtInDashboardMap[currentDashboard.value?.code || ''] || null,
);

const dashboardIcon = (type: string) => dashboardIcons[type] || DataBoard;
const dashboardTypeLabel = (type: string) =>
  ({
    BUILT: '平台内置看板',
    LINK: '外部链接看板',
    LOW_CODE_PAGE: '低代码看板',
    HTML_PAGE: '可视化大屏',
  }[type] || '运营看板');

const openDashboardPicker = () => {
  if (canSwitchDashboard.value) {
    drawerVisible.value = true;
  }
};

const selectDashboardFromRoute = () => {
  if (!dashboardListData.value.length) {
    currentDashboard.value = null;
    return;
  }
  const targetId = route.query.id?.toString() || '';
  const targetCode = route.query.code?.toString() || '';
  const targetName = route.query.name?.toString() || '';
  const matched = dashboardListData.value.find(
    item =>
      (targetId && String(item.id) === targetId) ||
      (targetCode && item.code === targetCode) ||
      (targetName && item.name === targetName),
  );
  const authorizedPluginDashboard = dashboardMenuAuthorized
    ? undefined
    : dashboardListData.value.find(
        item =>
          item.type === 'HTML_PAGE' &&
          Boolean(item.source) &&
          authorizedDashboardSources.has(item.source || ''),
      );
  currentDashboard.value =
    authorizedPluginDashboard ||
    matched ||
    dashboardListData.value.find(item => item.isDefault) ||
    dashboardListData.value[0];
};

const getDashboardList = async () => {
  loading.value = true;
  try {
    dashboardListData.value = await SystemService.getDashboardList();
    selectDashboardFromRoute();
  } finally {
    loading.value = false;
  }
};

const setDashboard = async (item: Dashboard) => {
  currentDashboard.value = item;
  drawerVisible.value = false;
  await router.replace({
    query: {
      ...route.query,
      id: String(item.id),
      code: undefined,
      name: undefined,
    },
  });
};

const isCurrentDashboard = (item: Dashboard) =>
  String(currentDashboard.value?.id ?? '') === String(item.id);

onMounted(getDashboardList);
watch(() => [route.query.id, route.query.code, route.query.name], selectDashboardFromRoute);
</script>

<style scoped lang="scss">
.dashboard-modern {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--zv-text-primary);
  background: var(--zv-bg-canvas);
}

.dashboard-toolbar {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.dashboard-picker {
  color: #eafaff !important;
  border: 1px solid rgba(57, 205, 255, 0.46);
  background: linear-gradient(135deg, rgba(0, 91, 178, 0.9), rgba(0, 38, 91, 0.9)) !important;
  box-shadow: 0 0 20px rgba(32, 189, 255, 0.18), inset 0 0 18px rgba(54, 208, 255, 0.1);
  backdrop-filter: blur(14px);
}

.dashboard-current {
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: 280px;
  padding: 6px 12px 6px 7px;
  color: #eaf7ff;
  border: 1px solid rgba(64, 181, 235, 0.34);
  border-radius: 999px;
  background: rgba(0, 18, 43, 0.78);
  box-shadow: 0 8px 24px rgba(0, 5, 18, 0.34);
  backdrop-filter: blur(16px);
}

.dashboard-current__icon {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  color: #62dcff;
  border-radius: 50%;
  background: rgba(25, 164, 225, 0.16);
}

.dashboard-current > span:last-child {
  display: grid;
  min-width: 0;

  small {
    color: #7699b2;
    font-size: 10px;
  }

  strong {
    color: #eaf7ff;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.drawer-title__mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #fff;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  box-shadow: 0 9px 24px rgb(37 99 235 / 25%);
}

.drawer-title > span:last-child {
  display: grid;

  strong {
    font-size: 16px;
  }

  small {
    margin-top: 2px;
    color: var(--zv-text-tertiary);
    font-size: 11px;
    font-weight: 400;
  }
}

.dashboard-list {
  display: grid;
  gap: 8px;
}

.dashboard-option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
  color: var(--zv-text-secondary);
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease,
    transform 180ms var(--zv-ease-out);

  &:hover {
    color: var(--zv-text-primary);
    border-color: var(--zv-border);
    background: var(--zv-bg-muted);
    transform: translateX(2px);
  }

  &.is-active {
    color: var(--zv-primary);
    border-color: rgb(var(--zv-primary-rgb) / 18%);
    background: rgb(var(--zv-primary-rgb) / 8%);
  }
}

.dashboard-option__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-right: 11px;
  flex: 0 0 40px;
  color: var(--zv-primary);
  border-radius: 11px;
  background: var(--zv-bg-surface);
  box-shadow: inset 0 0 0 1px var(--zv-border);
}

.dashboard-option.is-active .dashboard-option__icon {
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  box-shadow: 0 7px 18px rgb(37 99 235 / 20%);
}

.dashboard-option__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;

  > span {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  strong {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    padding: 2px 6px;
    color: var(--zv-primary);
    border-radius: 999px;
    background: rgb(var(--zv-primary-rgb) / 10%);
    font-size: 9px;
    font-style: normal;
    font-weight: 650;
  }

  small {
    color: var(--zv-text-tertiary);
    font-size: 11px;
  }
}

.dashboard-option__arrow {
  opacity: 0;
  transition: opacity 160ms ease, transform 160ms ease;
}

.dashboard-option:hover .dashboard-option__arrow,
.dashboard-option.is-active .dashboard-option__arrow {
  opacity: 0.72;
  transform: translateX(2px);
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  color: var(--zv-text-tertiary);
  font-size: 11px;

  span {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--zv-success);
    box-shadow: 0 0 0 4px rgb(22 163 74 / 10%);
  }
}

.dashboard-skeleton {
  padding-top: 8px;
}

.dashboard-canvas {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.dashboard-empty,
.dashboard-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20%;
}

.board-switch-enter-active,
.board-switch-leave-active {
  transition: opacity 180ms ease;
}

.board-switch-enter-from,
.board-switch-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .dashboard-current {
    display: none;
  }

  .dashboard-toolbar {
    top: 10px;
    left: 10px;
  }
}
</style>
