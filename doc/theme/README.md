# ZenVis UI 主题

ZenVis 主题由平台前端统一解析和应用，插件只消费语义 token，不再各自维护平台级 CSS、配色或动效。内置主题属于前端不可变资源，后端只保存主题 Manifest、版本和启用关系。

## 运行顺序

页面启动时按以下优先级选择主题：

1. 当前标签页的预览 Manifest（sessionStorage）。
2. 本地缓存的最近可用主题，立即完成首屏挂载。
3. 后台读取 `GET /api/v1/system/ui-theme/active`；成功后热更新。
4. 首次访问或缓存损坏时回退 `zenvis-naive-light`。

服务端 active 响应可以直接返回 Manifest，也可以返回带 `theme` 的激活信封，或仅返回 `frontend://zenvis-naive-light@1.0.0` 一类内置资源引用。

## 内置主题

- `zenvis-naive-light`：当前 ZenVis 亮色 Naive UI 视觉，作为稳定兼容基线。
- `zenvis-command-dark`：黑灰、绿色安全态势风格，使用高对比正文和状态色。
- `zenvis-calm-operations`：冷静运营控制台亮色主题，使用深海军蓝导航、清晰字阶、克制阴影和短促动效，适合 OneSOC 与 Lubinsun 高频运营页面。

内置主题可以预览、启用、克隆和导出，不能编辑或删除。自定义主题目前只能继承上述内置主题，避免出现不可解析的多级远程依赖。需要回退方案 3 时，在 UI 管理中重新启用 `zenvis-naive-light` 即可。

## Manifest

导入文件必须是 UTF-8 JSON，最大 64 KiB，并符合 [theme.schema.json](./theme.schema.json)。前端会执行严格字段和 token 白名单校验以保护本地预览，后端校验与超级管理员鉴权是保存和激活的最终安全边界。

```json
{
  "schema_version": "1.0",
  "id": "company-command-dark",
  "name": "Company Command Dark",
  "version": "1.0.0",
  "color_scheme": "dark",
  "extends": "zenvis-command-dark",
  "tokens": {
    "--zv-primary": "#16a34a"
  },
  "chart_palette": {
    "primary": "#16a34a"
  },
  "density": "compact",
  "motion_preset": "command"
}
```

主题包不会加载或执行任意 CSS/JavaScript。自定义 token 禁止 `url()`、`var()`、`calc()`、`color-mix()`、`image-set()`、外链协议、data URI、分号和样式块。需要新增语义能力时，应先在 `design-tokens.mjs` 增加平台 token 和组件消费，再升级 Schema/文档。

## 组件和插件契约

宿主将 resolved tokens 同步到 `html` CSS 变量，同时驱动：

- Naive UI 的亮/暗基座和 component overrides。
- Element Plus 的 `--el-*` 到 `--zv-*` 映射。
- AMIS STANDARD iframe 的 Plugin UI Contract payload。
- ECharts 的 `chart_palette`。
- 通用 `zv-*` 语义类，如指标卡、命令条、事件栈和详情栏。

STANDARD 插件会收到初始 `zenvis:ui` 和后续 `zenvis:theme-update`，无需重新载入 iframe。IMMERSIVE 与 EXTERNAL 页面继续拥有自己的画布视觉，宿主不会注入 STANDARD 样式。

payload 会同步 `themeVersion`、`density` 与 `motionPreset`。Calm Operations 使用 `comfortable` 密度与 `subtle` 动效；系统或用户启用 reduced motion 时，iframe 图表与 CSS 动画会一起停用。

业务插件不得新增 `soc-*`、`lubinsun-*` 一类平台视觉前缀；若确实需要新模式，应补充通用 `zv-*` 语义类。

## 管理接口

超级管理员页面为 `/system/ui-themes`，菜单路由名为 `ui-management`。前端使用：

- `GET /api/v1/system/ui-theme/list`
- `GET /api/v1/system/ui-theme/active`
- `POST /api/v1/system/ui-theme`
- `PUT /api/v1/system/ui-theme/{id}`
- `POST /api/v1/system/ui-theme/{id}/activate`
- `DELETE /api/v1/system/ui-theme/{id}`

所有 DTO 使用 snake_case。后端仍负责最终鉴权、并发版本和激活一致性。
