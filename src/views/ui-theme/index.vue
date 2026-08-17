<template>
  <div class="ui-theme-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow">SYSTEM · UI MANAGEMENT</span>
        <h1>界面主题管理</h1>
        <p>统一管理平台壳、Naive UI、Element Plus、AMIS 插件和图表的语义视觉。</p>
      </div>
      <div class="heading-actions">
        <n-button @click="openCreate">新建主题</n-button>
        <n-button type="primary" @click="selectImportFile">导入 JSON</n-button>
        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept="application/json,.json"
          @change="importJson"
        />
      </div>
    </header>

    <n-alert v-if="loadError" class="load-alert" type="warning" :show-icon="false">
      {{ loadError }}；内置主题仍可预览和导出。
    </n-alert>
    <n-alert v-if="themeSource === 'preview'" class="load-alert" type="info">
      <div class="preview-alert">
        <span>当前正在预览 {{ activeTheme.name }}，该预览仅对本浏览器标签页有效。</span>
        <n-button text type="primary" @click="exitPreview">退出预览</n-button>
      </div>
    </n-alert>

    <n-spin :show="loading">
      <section class="theme-grid">
        <article
          v-for="item in themeItems"
          :key="item.code"
          class="theme-card"
          :class="{ 'theme-card--active': isSelected(item) }"
        >
          <div
            class="theme-preview"
            :style="{
              background: item.resolved.tokens['--zv-bg-canvas'],
              color: item.resolved.tokens['--zv-text-primary'],
              borderColor: item.resolved.tokens['--zv-border'],
            }"
          >
            <div
              class="preview-sidebar"
              :style="{ background: item.resolved.tokens['--zv-sidebar'] }"
            ></div>
            <div class="preview-main">
              <div
                class="preview-header"
                :style="{ background: item.resolved.tokens['--zv-bg-surface'] }"
              ></div>
              <div class="preview-cards">
                <i
                  v-for="index in 3"
                  :key="index"
                  :style="{
                    background: item.resolved.tokens['--zv-bg-surface'],
                    borderColor: item.resolved.tokens['--zv-border'],
                  }"
                ></i>
              </div>
              <div
                class="preview-chart"
                :style="{
                  background: item.resolved.tokens['--zv-bg-surface'],
                  borderColor: item.resolved.tokens['--zv-border'],
                  '--preview-accent': item.resolved.tokens['--zv-primary'],
                }"
              ></div>
            </div>
          </div>

          <div class="theme-copy">
            <div class="theme-title">
              <div>
                <h2>{{ item.manifest.name }}</h2>
                <code>{{ item.code }}@{{ item.manifest.version }}</code>
              </div>
              <n-tag v-if="isPreviewing(item)" type="info" size="small">预览中</n-tag>
              <n-tag v-else-if="item.is_active" type="success" size="small">已启用</n-tag>
              <n-tag v-else-if="item.is_builtin" size="small">内置只读</n-tag>
            </div>
            <p>
              {{ item.manifest.color_scheme === 'dark' ? '暗色' : '亮色' }} ·
              {{ item.manifest.density === 'comfortable' ? '舒适' : '紧凑' }} ·
              {{ item.manifest.motion_preset || 'standard' }} 动效
            </p>
          </div>

          <footer class="theme-actions">
            <n-button size="small" @click="preview(item)">预览</n-button>
            <n-button size="small" @click="openClone(item)">克隆</n-button>
            <n-button v-if="!item.is_builtin" size="small" @click="openEdit(item)">编辑</n-button>
            <n-button size="small" @click="exportJson(item)">导出</n-button>
            <n-button
              size="small"
              type="primary"
              :disabled="item.is_active"
              @click="activate(item)"
            >
              启用
            </n-button>
            <n-button
              v-if="!item.is_builtin"
              size="small"
              type="error"
              quaternary
              @click="remove(item)"
            >
              删除
            </n-button>
          </footer>
        </article>
      </section>
    </n-spin>

    <n-modal
      v-model:show="editorVisible"
      preset="card"
      class="manifest-modal"
      :title="editorTitle"
      :mask-closable="false"
    >
      <n-alert type="info" :show-icon="false">
        仅接受 Theme Manifest JSON；不会加载或执行 CSS、JavaScript、远程 URL 或 data URI。
      </n-alert>
      <n-input
        v-model:value="manifestText"
        class="manifest-editor"
        type="textarea"
        :autosize="{ minRows: 18, maxRows: 26 }"
        spellcheck="false"
      />
      <template #footer>
        <div class="modal-actions">
          <n-button @click="editorVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveManifest">保存主题</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NAlert, NButton, NInput, NModal, NSpin, NTag, useDialog, useMessage } from 'naive-ui';

import { UiThemeService } from '@/service/api';
import {
  applyUiTheme,
  clearUiThemePreview,
  previewUiTheme,
  useUiThemeRuntime,
} from '@/theme/theme-runtime';
import {
  builtinUiThemes,
  isBuiltinUiTheme,
  resolveUiThemeManifest,
  validateUiThemeManifest,
} from '@/theme/theme-registry.mjs';
import type { ResolvedUiTheme, UiThemeManifest, UiThemeRecord } from '@/types/type-ui-theme';

defineOptions({ name: 'UiThemeManagement' });

type ThemeItem = UiThemeRecord & { resolved: Readonly<ResolvedUiTheme> };
type EditorMode = 'create' | 'clone' | 'edit';

const message = useMessage();
const dialog = useDialog();
const { activeTheme, themeSource } = useUiThemeRuntime();
const serverThemes = ref<UiThemeRecord[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const editorVisible = ref(false);
const editorMode = ref<EditorMode>('create');
const editingRecord = ref<UiThemeRecord>();
const manifestText = ref('');
const fileInput = ref<HTMLInputElement>();

const builtinRecords = builtinUiThemes.map(manifest => ({
  id: manifest.id,
  code: manifest.id,
  manifest: {
    ...manifest,
    tokens: { ...manifest.tokens },
    chart_palette: { ...manifest.chart_palette },
  },
  is_active: false,
  is_builtin: true,
}));

const themeItems = computed<ThemeItem[]>(() => {
  const merged = new Map<string, UiThemeRecord>();
  builtinRecords.forEach(item => merged.set(item.code, item));
  serverThemes.value.forEach(item => {
    const builtin = merged.get(item.code);
    merged.set(item.code, builtin ? { ...builtin, ...item, is_builtin: true } : item);
  });
  return [...merged.values()].map(item => ({
    ...item,
    resolved: resolveUiThemeManifest(item.manifest),
  }));
});

const editorTitle = computed(() => {
  if (editorMode.value === 'edit') return '编辑主题 Manifest';
  if (editorMode.value === 'clone') return '克隆为自定义主题';
  return '新建自定义主题';
});

const isPreviewing = (item: UiThemeRecord) =>
  themeSource.value === 'preview' && activeTheme.value.id === item.manifest.id;

const isSelected = (item: UiThemeRecord) => item.is_active || isPreviewing(item);

const loadThemes = async () => {
  loading.value = true;
  loadError.value = '';
  try {
    serverThemes.value = await UiThemeService.getList();
  } catch {
    loadError.value = '主题服务暂时不可用';
  } finally {
    loading.value = false;
  }
};

const uniqueCloneId = (sourceId: string) => {
  const base = `${sourceId.replace(/-copy(?:-\d+)?$/, '')}-copy`;
  const existing = new Set(themeItems.value.map(item => item.manifest.id));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
};

const openEditor = (mode: EditorMode, manifest: UiThemeManifest, item?: UiThemeRecord) => {
  editorMode.value = mode;
  editingRecord.value = item;
  manifestText.value = JSON.stringify(manifest, null, 2);
  editorVisible.value = true;
};

const openCreate = () => {
  openEditor('create', {
    schema_version: '1.0',
    id: 'my-zenvis-theme',
    name: 'My ZenVis Theme',
    version: '1.0.0',
    color_scheme: 'light',
    extends: 'zenvis-naive-light',
    tokens: {},
    chart_palette: {},
    density: 'compact',
    motion_preset: 'standard',
  });
};

const openClone = (item: UiThemeRecord) => {
  const clonesBuiltin = item.is_builtin;
  const builtinBase =
    item.manifest.extends && isBuiltinUiTheme(item.manifest.extends)
      ? item.manifest.extends
      : 'zenvis-naive-light';
  const manifest = {
    ...item.manifest,
    id: uniqueCloneId(item.manifest.id),
    name: `${item.manifest.name} Copy`,
    extends: clonesBuiltin ? item.manifest.id : builtinBase,
    tokens: clonesBuiltin ? {} : { ...item.manifest.tokens },
    chart_palette: clonesBuiltin ? {} : { ...item.manifest.chart_palette },
  };
  openEditor('clone', manifest);
};

const openEdit = (item: UiThemeRecord) => openEditor('edit', item.manifest, item);

const parseManifest = (value: string): UiThemeManifest => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('JSON 语法错误，请检查逗号、引号和括号。');
  }
  const result = validateUiThemeManifest(parsed);
  if (!result.valid) throw new Error(result.errors.join('\n'));
  if (isBuiltinUiTheme(result.manifest.id)) {
    throw new Error('内置主题不可覆盖，请先克隆后再编辑。');
  }
  return result.manifest;
};

const saveManifest = async () => {
  try {
    const manifest = parseManifest(manifestText.value);
    saving.value = true;
    if (editorMode.value === 'edit' && editingRecord.value) {
      await UiThemeService.update(editingRecord.value.id, manifest);
    } else {
      await UiThemeService.create(manifest);
    }
    editorVisible.value = false;
    message.success('主题已保存');
    await loadThemes();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '主题保存失败');
  } finally {
    saving.value = false;
  }
};

const preview = (item: UiThemeRecord) => {
  try {
    previewUiTheme(item.manifest);
    message.success('已进入本标签页预览');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '主题预览失败');
  }
};

const exitPreview = () => {
  clearUiThemePreview();
  message.success('已退出主题预览');
};

const activate = async (item: UiThemeRecord) => {
  try {
    const result = await UiThemeService.activate(item.id);
    applyUiTheme(result?.manifest || item.manifest, 'activation');
    message.success(`已启用 ${item.manifest.name}`);
    await loadThemes();
  } catch {
    message.error('主题启用失败');
  }
};

const remove = (item: UiThemeRecord) => {
  dialog.warning({
    title: '删除主题',
    content: `确认删除“${item.manifest.name}”吗？此操作不会删除内置主题。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await UiThemeService.delete(item.id);
        message.success('主题已删除');
        await loadThemes();
      } catch {
        message.error('主题删除失败');
      }
    },
  });
};

const exportJson = (item: UiThemeRecord) => {
  const blob = new Blob([JSON.stringify(item.manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${item.manifest.id}-${item.manifest.version}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const selectImportFile = () => fileInput.value?.click();

const importJson = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > 64 * 1024) return message.error('主题文件不能超过 64 KiB');
  try {
    const text = await file.text();
    const manifest = parseManifest(text);
    await UiThemeService.create(manifest);
    message.success('主题已导入');
    await loadThemes();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '主题导入失败');
  }
};

onMounted(loadThemes);
</script>

<style lang="scss" scoped>
.ui-theme-page {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: clamp(20px, 3vw, 40px);
  color: var(--zv-text-primary);
  background: radial-gradient(circle at 85% 0%, rgb(var(--zv-primary-rgb) / 0.08), transparent 32%),
    var(--zv-bg-canvas);
}

.page-heading,
.heading-actions,
.theme-title,
.theme-actions,
.modal-actions {
  display: flex;
  align-items: center;
}

.page-heading {
  max-width: 1440px;
  margin: 0 auto 24px;
  justify-content: space-between;
  gap: 24px;

  h1 {
    margin: 5px 0 6px;
    font-size: clamp(26px, 3vw, 38px);
    letter-spacing: -0.04em;
  }

  p {
    margin: 0;
    color: var(--zv-text-secondary);
  }
}

.eyebrow {
  color: var(--zv-primary);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.16em;
}

.heading-actions,
.theme-actions,
.modal-actions {
  gap: 8px;
}

.file-input {
  display: none;
}

.load-alert {
  max-width: 1440px;
  margin: 0 auto 16px;
}

.preview-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.theme-grid {
  display: grid;
  max-width: 1440px;
  margin: 0 auto;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 18px;
}

.theme-card {
  overflow: hidden;
  background: var(--zv-bg-surface);
  border: 1px solid var(--zv-border);
  border-radius: var(--zv-radius-lg);
  box-shadow: var(--zv-shadow-sm);
  transition: border-color 180ms var(--zv-motion), transform 180ms var(--zv-motion),
    box-shadow 180ms var(--zv-motion);

  &:hover {
    border-color: var(--zv-border-strong);
    box-shadow: var(--zv-shadow-md);
    transform: translateY(-2px);
  }
}

.theme-card--active {
  border-color: var(--zv-primary);
  box-shadow: 0 0 0 3px rgb(var(--zv-primary-rgb) / 0.1), var(--zv-shadow-md);
}

.theme-preview {
  display: flex;
  height: 190px;
  overflow: hidden;
  border-bottom: 1px solid;
}

.preview-sidebar {
  width: 22%;
}

.preview-main {
  display: flex;
  flex: 1;
  padding: 12px;
  flex-direction: column;
  gap: 10px;
}

.preview-header {
  height: 23px;
  border-radius: 7px;
}

.preview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  i {
    height: 42px;
    border: 1px solid;
    border-radius: 8px;
  }
}

.preview-chart {
  position: relative;
  flex: 1;
  overflow: hidden;
  border: 1px solid;
  border-radius: 9px;

  &::after {
    position: absolute;
    right: 12px;
    bottom: 12px;
    left: 12px;
    height: 45%;
    content: '';
    border-bottom: 3px solid var(--preview-accent);
    border-radius: 50%;
    transform: skewY(-8deg);
  }
}

.theme-copy {
  padding: 18px 18px 14px;

  p {
    margin: 10px 0 0;
    color: var(--zv-text-secondary);
    font-size: 13px;
  }
}

.theme-title {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0 0 6px;
    font-size: 18px;
  }

  code {
    color: var(--zv-text-muted);
    font-size: 11px;
  }
}

.theme-actions {
  padding: 0 18px 18px;
  flex-wrap: wrap;
}

.manifest-modal {
  width: min(860px, calc(100vw - 32px));
}

.manifest-editor {
  margin-top: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.modal-actions {
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-card {
    transition: none;
  }
}
</style>
