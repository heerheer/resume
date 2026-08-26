# EdgeOne KV 云同步功能实施计划

## 概要

为简历应用添加基于 EdgeOne KV 的云同步能力：用户在主页顶部输入「密钥」，验证成功后按简历编号（本地 `StoredResume.id`）与云端同步。已同步的简历显示云朵徽标；本地独有的简历显示 sync 按钮；云端与本地 MD5 不一致时显示红色冲突警告并提供冲突解决（使用云端/使用本地/查看云端/查看本地）。

- 密钥验证：服务端固定密钥模式（环境变量 `SYNC_PASSWORD`），未配置时退化为「任意密钥均有效」（每个密钥独立数据空间）。
- 删除联动：启用密钥时，本地删除简历同步删除云端数据。

## 现状分析

- Next.js 16 App Router 项目，根目录即项目根（`/workspace`）。
- 数据模型：`StoredResume { id, createdAt, updatedAt, resumeData }`（[types/resume.ts](file:///workspace/types/resume.ts)），全部存于 localStorage（`lib/storage.ts`，key = `resume.entries`）。
- 首页 = [components/user-center.tsx](file:///workspace/components/user-center.tsx)：表格列出简历，编号列显示 `it.id.slice(0, 8)`，操作列有 查看/导出/编辑/克隆/删除。
- 保存入口（自动同步的挂钩点）：
  - [app/edit/[id]/page.tsx](file:///workspace/app/edit/[id]/page.tsx) `handleSave` → `updateEntryData(id, data)`
  - [app/edit/new/page.tsx](file:///workspace/app/edit/new/page.tsx) `handleSave` → `createEntryFromData(current)`（首次保存后 `router.replace(/edit/<id>)`）
  - [components/user-center.tsx](file:///workspace/components/user-center.tsx) `handleImport` → `createEntryFromData(data)`
- 查看入口：[app/view/[id]/page.tsx](file:///workspace/app/view/[id]/page.tsx)，客户端组件 `getResumeById(id)` 后渲染 `ResumePreview`。
- EdgeOne 约束（来自 edgeone-makers-tools skill）：
  - KV **仅**在 Edge Functions（`edge-functions/` 目录，V8 运行时）可用，KV 命名空间是控制台绑定的**全局变量**（不在 `context.env`）；无 npm、无 Node 内建、无 `Response.json()`；请求体上限 1MB；`crypto.subtle` 可用（不支持 MD5）。
  - 本地测试须用 `edgeone makers dev -n <项目名> --skip-env-sync`（项目需 link，KV 需在控制台绑定）；CLI 前置 `PAGES_SOURCE=skills`；curl 验证用 `curl --noproxy '*' http://127.0.0.1:8088/...`。
  - 本项目部署到非 EdgeOne 平台（如 Vercel）时 edge-functions 不生效，前端需对同步 API 不可用做优雅降级。

## 方案设计

### 数据模型（KV）

- KV 命名空间绑定变量名：**`resume_kv`**（用户在 EdgeOne 控制台创建命名空间并绑定到项目，变量名必须是 `resume_kv`）。
- 数据隔离：`scope = sha256hex(key + SYNC_SALT)`（SYNC_SALT 为环境变量，默认空串）。KV key 只用字母数字与下划线：`kvKey = "<scope>_<uuid去掉连字符>"`。
- KV value（JSON 字符串）：

```json
{
  "id": "<完整uuid>",
  "md5": "<payload的MD5>",
  "updatedAt": "<ISO时间>",
  "payload": "<resumeData的紧凑JSON字符串>"
}
```

- **MD5 一致性核心规则**：`payload` 是客户端 `JSON.stringify(resumeData)` 的原样字符串，服务端原样存储并计算 `md5(payload)`。本地比较时对 `entry.resumeData` 重新 `JSON.stringify` 后取 MD5（JSON round-trip 字节稳定）。「使用云端」拉回时必须原样保存云端 payload 解析后的对象，不做任何字段改写，保证 MD5 重新一致。

### API 设计（Edge Functions，同源无 CORS）

**`edge-functions/api/sync.js`** → `GET /api/sync?key=<密钥>`

- 校验密钥（见下）→ 分页 `resume_kv.list({ prefix: scope + "_" })` 并批量 get → 返回 `{ ok: true, entries: [{ id, md5, updatedAt }] }`。
- 该接口同时承担「验证密钥」职责：密钥非法返回 401 `{ ok: false, error: "invalid_key" }`。

**`edge-functions/api/sync/[id].js`** → `/api/sync/<id>`

- `GET ?key=<密钥>`：读取单条 → `{ ok: true, id, md5, payload }`；不存在 404。
- `PUT`，body `{ key, payload }`：校验 payload 为合法 JSON 字符串、长度 ≤ 1MB → 计算 md5 → `put(kvKey, record)` → `{ ok: true, id, md5, updatedAt }`。
- `DELETE ?key=<密钥>` 或 body `{ key }`：删除对应 KV key → `{ ok: true }`。

**通用守卫（两个文件共享的行内辅助函数）**：

1. 密钥校验：空 key → 400；`SYNC_PASSWORD` 已配置且 `key !== SYNC_PASSWORD` → 401 `invalid_key`；未配置 `SYNC_PASSWORD` 时任何非空 key 通过（独立数据空间）。
2. 站点口令守卫：`SITE_PASSWORD` 已配置时，要求 Cookie `site_auth === sha256hex(SITE_PASSWORD)`（与 Next middleware 同算法，Web Crypto subtle），否则 401（防止绕过站点口令直接打同步 API）。
3. KV 未绑定：`typeof resume_kv === "undefined"` → 500 `{ error: "kv_not_bound" }`。
4. 响应统一 `new Response(JSON.stringify(...), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } })`。
5. 每个文件内联：MD5 纯 JS 实现（RFC 1321）、sha256hex（crypto.subtle）、CORS 不需要（同源）。
6. env 读取：`context.env.SYNC_PASSWORD / SYNC_SALT / SITE_PASSWORD`。

### 环境变量（部署时给定；本地测试可设）

| 变量 | 作用 | 缺省 |
|---|---|---|
| `SYNC_PASSWORD` | 固定密钥；配置后密钥必须与其一致 | 未配置 = 任意密钥有效 |
| `SYNC_SALT` | scope 哈希加盐，防猜测 | 空串 |
| `SITE_PASSWORD` | 已有站点口令；设置时同步 API 同时校验 `site_auth` Cookie | 已有逻辑 |

新建 `.env.example` 声明以上变量（含注释），便于部署时注入。

### 前端改动

**新增 `lib/md5.ts`**：纯 TS MD5 实现（与边缘函数同一算法移植），导出 `md5(input: string): string`（hex）。

**新增 `lib/sync.ts`**（同步客户端）：

- `getSyncKey() / setSyncKey() / clearSyncKey()`：localStorage `resume.sync.key`。
- `listCloud(key): Promise<Array<{id, md5, updatedAt}>>`：GET `/api/sync?key=`；401 抛「密钥无效」错误。
- `getCloudResume(key, id): Promise<{ md5, payload: string }>`。
- `pushResume(key, id, resumeData): Promise<{ md5 }>`：PUT，body 中 `payload = JSON.stringify(resumeData)`。
- `deleteCloudResume(key, id)`。
- `localMd5(resumeData) = md5(JSON.stringify(resumeData))`。
- `autoSyncIfEnabled(id, resumeData)`：密钥存在时静默 push，失败 toast 警告（「云同步失败：…」），成功不打扰。

**修改 [components/user-center.tsx](file:///workspace/components/user-center.tsx)**（核心 UI）：

- 顶部新增密钥条（工具栏上方一行）：密钥输入框（`type="password"`）+「保存密钥」按钮；已连接状态显示「云同步已启用」徽标 +「退出」按钮（清密钥与云端状态，不影响本地数据）。
- 状态：`syncKey`、`cloudMap: Map<id, {md5, updatedAt}>`、`syncBusy`。
- 挂载时若本地存有密钥 → 自动 `listCloud`：
  - 密钥无效（401）→ toast + 清除本地密钥；
  - 成功 → 执行登录同步：对云端存在而本地缺失的 id，逐个 `getCloudResume` 并 `upsertResume({ id, createdAt: payload.createdAt, updatedAt: cloud.updatedAt, resumeData: JSON.parse(payload) })`（**不改写字段**，保证 MD5 一致），然后 `refresh()`。
- 每行同步状态派生（`useMemo`）：`synced`（cloud 有且 md5 相等）/ `conflict`（cloud 有且 md5 不等）/ `localOnly`（key 启用且 cloud 无此 id）/ 无。
- **编号列**渲染（id 文本旁）：
  - `synced`：云朵 icon badge（Tooltip「云同步」）；
  - `localOnly`：小型 sync 图标按钮（Tooltip「同步到云端」），点击 `pushResume` 后更新 `cloudMap` → 变为云朵徽标；
  - `conflict`：红色警告 icon（Tooltip「云同步冲突」）。
- **操作列**：`conflict` 行新增「冲突解决」`DropdownMenu` 按钮，四个子项：
  - 使用云端：`getCloudResume` → `upsertResume`（原样覆盖本地，不改写 createdAt/updatedAt）→ 重新 `listCloud` + `refresh()`；
  - 使用本地：`pushResume` 本地数据 → 状态变为 synced；
  - 查看云端：`router.push(\`/view/${id}-cloud\`)`（与现有查看操作一致的跳转方式）；
  - 查看本地：`router.push(\`/view/${id}\`)`。
- 删除联动：`handleDelete` 中若密钥启用，对每个 id 调 `deleteCloudResume`（失败仅 toast 警告，本地照常删除）。
- 导入联动：`handleImport` 成功后调用 `autoSyncIfEnabled(entry.id, data)`。
- 所有 fetch 失败（含 /api/sync 404 = 平台无 edge functions）→ 优雅降级：toast 提示「云同步不可用」，UI 回到无密钥状态。

**修改 [app/view/[id]/page.tsx](file:///workspace/app/view/[id]/page.tsx)**：支持 `<id>-cloud`：

- id 以 `-cloud` 结尾时：`realId = id.slice(0, -6)`；从 localStorage 取密钥，异步 `getCloudResume` 渲染 `ResumePreview`（新增 loading / 无密钥 / 获取失败三种兜底视图，样式复用现有「未找到该简历」结构）；标题栏文案「预览（云端）：title」。
- 普通本地查看路径逻辑不变（仍为同步 `useMemo` 读取）。

**修改 [app/edit/[id]/page.tsx](file:///workspace/app/edit/[id]/page.tsx)**：`handleSave` 本地保存成功后调用 `autoSyncIfEnabled(id, data)`（不阻塞返回主页）。

**修改 [app/edit/new/page.tsx](file:///workspace/app/edit/new/page.tsx)**：`handleSave` 创建成功后调用 `autoSyncIfEnabled(entry.id, current)`（在 `router.replace` 前触发，不 await 阻塞跳转）。

## 实施步骤

1. 新增 `lib/md5.ts`、`lib/sync.ts`。
2. 新增 `edge-functions/api/sync.js`、`edge-functions/api/sync/[id].js`（含内联 md5/sha256/守卫逻辑）。
3. 修改 `app/edit/[id]/page.tsx`、`app/edit/new/page.tsx`（保存后自动同步）。
4. 修改 `components/user-center.tsx`（密钥条、登录同步、编号列三种状态、冲突解决菜单、删除联动、导入联动）。
5. 修改 `app/view/[id]/page.tsx`（`-cloud` 云端查看）。
6. 新增 `.env.example`；更新 `README.md`（云同步章节：控制台 KV 绑定 `resume_kv`、环境变量、功能说明）。

## 验证

1. `pnpm build` 通过（TS/ESLint 不回归）。
2. EdgeOne 本地测试（按 skill 规范）：
   - `npm i -g edgeone@latest`（确保 ≥1.6.7）；`edgeone -v`。
   - `edgeone whoami` 检查登录；未登录则请用户提供 token（`-t`）或浏览器登录。
   - `PAGES_SOURCE=skills edgeone makers dev -n resume --skip-env-sync`（后台运行）。
   - curl 冒烟（`--noproxy '*' http://127.0.0.1:8088`）：
     - `GET /api/sync?key=test` → 200 + entries（若 KV 未绑定 → 500 kv_not_bound，提示用户到控制台绑定 `resume_kv`）；
     - `PUT /api/sync/<id>` 写入一条样例 payload → `GET /api/sync` 列表可见、MD5 正确；
     - `GET /api/sync/<id>` 取回 payload 与写入字节一致；
     - 错误密钥（配置 SYNC_PASSWORD 场景）→ 401。
   - 设置 `SYNC_PASSWORD=test123` 重启 dev，浏览器走完整 UI 流程：保存密钥 → 拉取云端 → 云朵徽标 → 修改本地制造冲突 → 红色警告 + 冲突解决四选项 → `-cloud` 云端查看。
3. 通过后询问用户是否 `edgeone makers deploy`（部署与上线由用户确认后执行，URL 完整输出含 query 参数）。

## 假设与决策

- 密钥即同步凭证，UI 不引入登录账号体系；密钥存 localStorage 明文（与现有本地数据同级的信任模型）。
- KV 绑定变量名固定为 `resume_kv`（部署时在控制台绑定，本地 dev 需项目 link 后注入）。
- Edge Function 请求体上限 1MB：超大数据（如超大头像 data-URL）同步会失败并提示，不做分片。
- 冲突只保留「云端 or 本地」覆盖语义，无合并；「使用云端/本地」覆盖后 MD5 即一致。
- `payload` 原样透传是 MD5 一致性的关键约束，任何一侧都不得改写 JSON 内容（包括 `updatedAt`）。
- KV 最终一致性 ≤60s：本地刚 push 后立刻在另一设备 list 可能读旧值，属平台特性，不做额外处理。
