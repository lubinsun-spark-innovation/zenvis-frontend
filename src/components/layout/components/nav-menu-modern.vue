<template>
  <div class="header-navigation">
    <n-menu
      class="primary-navigation"
      mode="horizontal"
      :options="menuOptions"
      :value="currentKey"
      responsive
      @update:value="goMenu"
    />

    <div class="header-tools">
      <n-dropdown :options="userOptions" trigger="click" @select="handleUserAction">
        <n-button quaternary class="user-trigger">
          <n-avatar round :size="34" class="user-avatar">{{ userInitial }}</n-avatar>
          <span class="user-summary">
            <strong>{{ userInfo.name || '当前用户' }}</strong>
            <small>{{ userInfo.email || '安全运营中心' }}</small>
          </span>
          <n-icon :size="15" class="user-chevron"><ArrowDown /></n-icon>
        </n-button>
      </n-dropdown>
    </div>

    <Password :show="showPassword" @on-ok="submit" @on-cancel="closeModel" />
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAvatar,
  NButton,
  NDropdown,
  NIcon,
  NMenu,
  type DropdownOption,
  type MenuOption,
  useDialog,
  useMessage,
} from 'naive-ui';
import { ArrowDown, Lock, SwitchButton } from '@element-plus/icons-vue';
import JSEncrypt from 'jsencrypt';

import Password from './nav-password.vue';
import { UserService } from '@/service/api';
import { readExplicitHtmlUiProfile } from '@/theme/plugin-profile.mjs';
import { clearLoginSession, getPermissionList, getUserInfo } from '@u/auth-session';

defineOptions({ name: 'NavMenuModern' });

type PermissionItem = {
  code: string;
  name: string;
  route?: string;
  params?: string;
  ui_profile?: string;
  uiProfile?: string;
  superscript?: string;
  children?: PermissionItem[];
};

const router = useRouter();
const route = useRoute();
const dialog = useDialog();
const message = useMessage();
const showPassword = ref(false);
const currentKey = ref<string>('');
const userInfo = getUserInfo<{ name?: string; email?: string }>() || {};
const permissionList = getPermissionList<PermissionItem[]>() || [];
const menuLookup = new Map<string, PermissionItem>();

const userInitial = computed(() => (userInfo.name || userInfo.email || 'U').trim().slice(0, 1).toUpperCase());

const buildLabel = (item: PermissionItem) => () =>
  h('span', { class: 'menu-label' }, [
    h('span', item.name),
    item.superscript ? h('span', { class: 'menu-badge' }, item.superscript) : null,
  ]);

const toMenuOption = (item: PermissionItem): MenuOption => {
  menuLookup.set(item.code, item);
  return {
    key: item.code,
    label: buildLabel(item),
    children: item.children?.map(toMenuOption),
  };
};

const menuOptions = permissionList.map(toMenuOption);

const findActiveKey = (items: PermissionItem[], routeName: string, menuParam = ''): string => {
  for (const item of items) {
    const matchesRoute = item.route === routeName;
    const matchesParam = !menuParam || String(item.params || '') === menuParam;
    if (matchesRoute && matchesParam) return item.code;
    const childKey = item.children ? findActiveKey(item.children, routeName, menuParam) : '';
    if (childKey) return childKey;
  }
  return '';
};

watch(
  () => [route.name, route.params.menuParams] as const,
  ([routeName, rawMenuParam]) => {
    const menuParam = Array.isArray(rawMenuParam) ? rawMenuParam[0] || '' : String(rawMenuParam || '');
    currentKey.value = findActiveKey(permissionList, String(routeName || ''), menuParam);
  },
  { immediate: true },
);

const goMenu = (key: string) => {
  const item = menuLookup.get(key);
  if (!item?.route) return;
  currentKey.value = key;
  const uiProfile =
    item.route === 'html-page'
      ? readExplicitHtmlUiProfile(item.ui_profile ?? item.uiProfile)
      : undefined;
  router.push({
    name: item.route,
    params: { menuParams: item.params },
    query: uiProfile ? { ui_profile: uiProfile } : undefined,
  });
};

const renderDropdownIcon = (icon: typeof Lock) => () => h(NIcon, null, { default: () => h(icon) });

const userOptions: DropdownOption[] = [
  {
    key: 'profile',
    type: 'render',
    render: () =>
      h('div', { class: 'user-dropdown-profile' }, [
        h(NAvatar, { round: true, size: 38, class: 'user-avatar' }, { default: () => userInitial.value }),
        h('div', [
          h('strong', userInfo.name || '当前用户'),
          h('span', userInfo.email || '安全运营中心'),
        ]),
      ]),
  },
  { key: 'divider-1', type: 'divider' },
  { key: 'password', label: '修改密码', icon: renderDropdownIcon(Lock) },
  { key: 'logout', label: '退出登录', icon: renderDropdownIcon(SwitchButton) },
];

const handleUserAction = (key: string) => {
  if (key === 'password') {
    showPassword.value = true;
    return;
  }
  if (key !== 'logout') return;
  dialog.warning({
    title: '退出登录',
    content: '确认结束当前会话并返回登录页吗？',
    positiveText: '确认退出',
    negativeText: '继续使用',
    onPositiveClick: async () => {
      await UserService.doLogOut();
      clearLoginSession();
      await router.push({ name: 'login' });
    },
  });
};

const submit = async (params: Record<string, string>) => {
  const encryptor = new JSEncrypt();
  const res = await UserService.getEncrypyKey();
  encryptor.setPublicKey(res.key);
  await UserService.editPassword({
    old_password: encryptor.encrypt(params.old_password) || '',
    password: encryptor.encrypt(params.password) || '',
  });
  message.success('密码已更新，请重新登录');
  showPassword.value = false;
  handleUserAction('logout');
};

const closeModel = () => {
  showPassword.value = false;
};
</script>

<style lang="scss" scoped>
.header-navigation {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  height: 100%;
}

.primary-navigation {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: transparent;

  :deep(.n-menu-item),
  :deep(.n-submenu) {
    height: 100%;
  }

  :deep(.n-menu-item-content),
  :deep(.n-submenu .n-menu-item-content) {
    height: 42px;
    margin: 0 3px;
    padding-inline: 14px;
    border-radius: 11px;
  }

  :deep(.n-menu-item-content--selected),
  :deep(.n-menu-item-content--child-active) {
    background: var(--zv-primary-soft);
  }

  :deep(.n-menu-item-content-header) {
    font-size: 14px;
    font-weight: 650;
    letter-spacing: 0.01em;
  }
}

.header-tools {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
}

.user-trigger {
  height: 46px;
  padding: 5px 8px 5px 5px;
  border-radius: 13px;
}

.user-avatar {
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, var(--zv-primary), var(--zv-cyan));
  box-shadow: 0 7px 18px rgba(79, 110, 247, 0.25);
}

.user-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 126px;
  margin-left: 9px;
  line-height: 1.25;

  strong,
  small {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--zv-text);
    font-size: 13px;
    font-weight: 700;
  }

  small {
    margin-top: 3px;
    color: var(--zv-text-muted);
    font-size: 11px;
  }
}

.user-chevron {
  margin-left: 8px;
  color: var(--zv-text-muted);
}

.menu-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.menu-badge {
  display: inline-flex;
  align-items: center;
  min-width: 18px;
  height: 18px;
  padding-inline: 5px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  background: linear-gradient(135deg, #ef476f, #ff8a5c);
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(239, 71, 111, 0.24);
}

:global(.user-dropdown-profile) {
  display: flex;
  align-items: center;
  min-width: 220px;
  padding: 9px 10px;
  gap: 11px;
}

:global(.user-dropdown-profile > div) {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

:global(.user-dropdown-profile strong),
:global(.user-dropdown-profile span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.user-dropdown-profile span) {
  margin-top: 3px;
  color: var(--zv-text-muted);
  font-size: 12px;
}

@media (max-width: 1180px) {
  .user-summary {
    display: none;
  }

  .primary-navigation :deep(.n-menu-item-content),
  .primary-navigation :deep(.n-submenu .n-menu-item-content) {
    padding-inline: 10px;
  }
}
</style>
