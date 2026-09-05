# 简历生成器
> ⭐⭐⭐ **如果这个项目对您有帮助，请给个小星星！** 您的支持是我持续改进和添加新功能的动力。

一个灵活且功能强大的简历构建和导出工具，帮助用户快速创建、编辑和导出干净、简洁而又专业的简历，支持所见即所得。数据存储在浏览器，本地保存与管理简历更放心。

## 功能特点

- **用户中心**: 首页集中管理你的简历，支持检索、排序、批量选择与删除、导入/导出
- **本地存储**: 多份简历持久化到浏览器 `localStorage`，随开随用（支持 JSON 备份还原）
- **云同步**: 基于 EdgeOne Blob 的多设备数据同步（密钥验证、按编号同步、冲突检测与解决）
- **简历编辑**: 直观的界面，轻松编辑个人信息和简历内容
- **模块化设计**: 支持添加、删除和重排简历模块
- **实时预览**: 即时查看简历编辑效果
- **PDF 导出**: 优先由服务端 Chromium 渲染同一份 HTML/CSS 生成干净 PDF；不可用时自动降级浏览器打印，并给出引导
- **图片导出**: 支持导出为 PNG、JPG、WEBP、SVG 等图片格式
- **富文本支持**: 支持自由设置文本格式，如字体、文字大小、颜色、对齐方式以及是否加粗、URL 链接等
- **AI 优化**: 多行输入框右下角提供「AI 优化」按钮，内置 ASu-skills（great-resume 简历提升）把经历改写为更贴合招聘方的表达，弹窗预览确认后回填
- **自适应**: 支持不同模块/布局自由组合，自动调整元素尺寸

<p align="left">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwzdnzd%2Fresume&env=SITE_PASSWORD&project-name=resume&repository-name=resume" target="_blank" rel="noopener noreferrer"><img src="https://vercel.com/button" alt="Vercel" height="30"></a>
  &nbsp;
  <a href="https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fwzdnzd%2Fresume&env=SITE_PASSWORD&project-name=resume&repository-name=resume" target="_blank" rel="noopener noreferrer"><img src="https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg" alt="EdgeOne Pages" height="30"></a>
</p>

## 页面示例截图
1. 用户中心：本地化集中管理多份简历
![用户中心](./docs/user-center.png)

1. 编辑和预览：随时查看渲染效果
![编辑和预览界面](./docs/edit-preview.png)

1. 仅编辑：专注于编写
![仅编辑](./docs/edit-only.png)

1. 仅预览：简历效果一览无余
![仅预览](./docs/preview-only.png)

1. 自由布局：左对齐/居中对齐、列数调整等多个选项随心控制
![自由布局](./docs/multi-line.png)

1. 多种导出方式：不同成品满足不同需求
![导出方式](./docs/export.png)

1. 标签功能：为企业或项目等添加标签，让HR/面试官快速理解你
![标签添加](./docs/tags.png)

## 技术栈

- **前端框架**: Next.js
- **UI组件**: Shadcn UI
- **样式**: Tailwind CSS
- **PDF生成**: puppeteer-core + @sparticuz/chromium（Serverless 友好）
- **图标**: Iconify

## 快速开始

### 安装依赖

```bash
# 使用pnpm安装依赖
pnpm install
```

### 开发环境运行

```bash
pnpm dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。本地已默认集成 `puppeteer-core` 与 `@sparticuz/chromium`，服务端 PDF 可直接使用；当不可用时会自动降级为浏览器打印。

### 构建生产版本

```bash
pnpm build
```

## 项目结构
```
/
├── app/
│  ├── globals.css
│  ├── layout.tsx
│  ├── page.tsx                         # 首页：用户中心（本地简历管理 + 云同步）
│  ├── edit/
│  │  ├── new/page.tsx                  # 新建简历（可选携带 ?clone=ID 预填）
│  │  └── [id]/page.tsx                 # 编辑本地已保存的简历
│  ├── view/[id]/page.tsx               # 仅预览本地已保存的简历（支持 <id>-cloud 云端预览）
│  ├── pdf/preview/[filename]/page.tsx  # 在线 PDF 预览页（服务端优先，自动降级打印）
│  ├── print/page.tsx                   # 打印专用页面（供 Chromium 渲染）
│  ├── auth/page.tsx                    # 访问口令输入页（可选）
│  └── api/
│     ├── auth/route.ts                 # 认证接口（设置 Cookie）
│     ├── image-proxy/route.ts          # 远程图片代理（用于导出防跨域）
│     └── pdf/
│        ├── health/route.ts            # 健康检查（尝试启动 headless 浏览器）
│        ├── [filename]/route.ts        # 生成并缓存 PDF（POST→303→GET 下载/预览）
│        └── route.ts                   # 直接生成并返回 PDF（Puppeteer + Chromium）
├── cloud-functions/
│  └── api/
│     ├── sync.js                       # 云同步 API（EdgeOne Cloud Function）：列出/验证密钥
│     └── sync/[id].js                  # 云同步 API：单条简历读取/推送/删除（EdgeOne Blob）
├── components/
│  ├── user-center.tsx                  # 用户中心（首页）
│  ├── export-button.tsx                # 一键导出（PDF/图片/JSON）
│  ├── resume-builder.tsx               # 简历编辑主界面
│  ├── resume-preview.tsx               # HTML 预览（PDF 与预览同源 HTML/CSS）
│  ├── print-content.tsx                # 打印内容容器
│  ├── pdf-viewer.tsx                   # 自动选择：服务端 PDF 或浏览器打印
│  └── ui/…                             # Shadcn UI 基础组件集合
├── hooks/
│  ├── use-mobile.ts
│  └── use-toast.ts
├── lib/
│  ├── utils.ts                         # 通用工具（默认模板、导出工具等）
│  ├── storage.ts                       # 本地存储封装（localStorage）
│  ├── md5.ts                           # 纯 TS MD5 实现（云同步摘要比对）
│  └── sync.ts                          # 云同步客户端（EdgeOne Blob API 封装）
├── styles/
│  ├── globals.css
│  ├── print.css                        # 打印样式
│  └── tiptap.css                       # 富文本编辑器样式
├── public/
│  ├── NotoSansSC-Medium.ttf            # 字体（预览/打印共用）
│  ├── template.json                    # 示例简历数据
│  └── …
└── types/
   └── resume.ts
```

## 简历数据
```typescript
export interface ResumeFile {
  version: string;
  data: ResumeData;
  metadata: {
    exportedAt: string;
    appVersion: string;
  };
}

export interface ResumeData {
  title: string;                     // 简历标题/姓名
  centerTitle?: boolean;             // 标题是否居中
  personalInfoSection: PersonalInfoSection; // 个人信息模块（支持 inline/grid）
  jobIntentionSection?: JobIntentionSection; // 求职意向模块（可选）
  modules: ResumeModule[];           // 其它模块（教育/经历/项目等）
  avatar?: string;                   // 头像 URL（可为 data:URL）
  createdAt: string;
  updatedAt: string;
}
```

## 功能说明
> 基于 [resume-builder](https://github.com/magicyan418/resume-builder) 二次开发，感谢原作者的开源。

### 用户中心与本地存储

- 首页即用户中心：集中管理本地保存的简历条目
- 数据存储在浏览器 `localStorage`，纯本地化更放心
- 操作：新建、编辑、预览、复制（从现有条目预填）、导入与导出、批量选择与删除等
- 支持按标题搜索、按名称/创建时间/更新时间排序
- 空间不足时会提示先导出 JSON 做备份再清理

### 个人信息编辑

支持添加、编辑和删除个人信息项，如姓名、电话、邮箱等。每个信息项可以设置标签、值和图标。

### 求职意向

支持添加、编辑和删除个人求职意向、期望薪资、目标城市等信息。

### 简历模块

支持多种类型的简历模块，如教育背景、工作经历、项目经验等。每个模块可以包含标题、图标、和详细内容。

### PDF 导出（服务端优先，自动降级）

- 服务端优先：`POST /api/pdf` 使用 `puppeteer-core + @sparticuz/chromium` 打开`/print`，通过`sessionStorage`传入数据，设置`displayHeaderFooter:false`、`printBackground:true`、`preferCSSPageSize:true`，返回干净的`application/pdf`（inline）。
- 降级体验：若服务端不可用或失败，自动使用浏览器打印（所见即所得），界面会提示：
  - 关闭“页眉和页脚”
  - 勾选“背景图形”

环境变量（可选）
- `NEXT_PUBLIC_FORCE_SERVER_PDF=true` 强制使用服务端 PDF
- `NEXT_PUBLIC_FORCE_PRINT=true` 强制使用浏览器打印
- `PUPPETEER_EXECUTABLE_PATH=/path/to/chrome` 或 `CHROME_PATH=/path/to/chrome` 指定系统 Chrome 可执行文件（在某些平台上更稳定）

接口说明
- `GET /api/pdf/health`：健康检查，验证 headless 启动能力
- `POST /api/pdf`：传入`{ resumeData }`，直接返回`application/pdf`
- `POST /api/pdf/:filename`：传入`{ resumeData }`，生成后返回`303`到`GET /api/pdf/:filename?token=...`（便于内联预览/下载）
- `GET /api/pdf/:filename?token=...`：短期缓存（约 5 分钟）内联返回 PDF
- `GET /api/image-proxy?url=...`：图片代理，导出图片时用于规避跨域与画布污染

### AI 优化（多行输入框「AI 优化」按钮）

内置 [ASu-skills](https://github.com/Hisn00w/ASu-skills)（great-resume 简历提升技能），对输入框中的单段文本做「酥化」改写。流程：点击右下角按钮 → 下拉选择「使用 AsuSkills 优化」 → 调用后端 → 弹窗预览「原文 vs 优化后」 → 确认后回填。

后端通过环境变量配置一个 OpenAI 兼容的 Chat Completions 端点（默认指 Oracle OCI Generative AI 的 OpenAI 兼容端点）：

- `AI_API_BASE_URL`：OpenAI 兼容端点地址（默认 `https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/openai/v1`）
- `AI_API_KEY`：API Key（必填，未配置时接口返回 501）
- `AI_MODEL`：模型 id（默认 `cohere.command-a-03-2025`，可换 gpt-oss / llama 等 OCI 支持的模型）

也可把 `AI_API_BASE_URL` 指向任意 OpenAI 兼容网关（OneAPI / DeepSeek / 本地 vLLM 等）。参考 `.env.example`。
### 部署到 Vercel

- 仅支持 Node.js Runtime 的 Serverless Functions（不是 Edge）。
- 我们在 `route.ts` 中声明了 `export const runtime = 'nodejs'` 与 `dynamic = 'force-dynamic'`。
- 依赖：`puppeteer-core`、`@sparticuz/chromium`（Serverless 友好）。无需打包二进制。
- 建议在项目设置提升函数超时与内存（如 1024MB/1536MB）。

### 数据导入导出

- 在“用户中心”可导入 `.json` 文件；导出支持 JSON、PDF、PNG/JPG/WEBP/SVG 多种格式
- 编辑页右上角亦内置导出菜单；导出 PDF 默认走服务端，可降级浏览器打印

## 自定义主题

项目使用 Tailwind CSS 进行样式管理，可按需扩展样式与主题（见样式与组件代码）。


## 云同步（EdgeOne Blob）

数据存储在 EdgeOne Blob（需部署到 EdgeOne Pages/Makers，本地数据仍以 localStorage 为主）。

### 使用方式

1. 在主页顶部的「云同步」输入框中输入密钥并点击「验证并启用」
2. 验证成功后：
   - 云端存在而本地缺失的简历会自动拉回本地
   - 已同步的简历在编号旁显示云朵图标（hover 提示「云同步」）
   - 本地存在而云端没有的简历显示 `sync` 图标按钮，点击后上传
   - 启用密钥后，每次保存/导入简历都会自动同步到云端
   - 删除本地简历时，云端对应数据也会被删除
3. 冲突处理：云端返回的 MD5 与本地数据 MD5 不一致时，编号旁显示红色警告，操作列出现「冲突解决」菜单（使用云端 / 使用本地 / 查看云端 / 查看本地）。「查看云端」会以 `<编号>-cloud` 打开一个新的简历查看视图

### 环境变量（可选）

- `SYNC_PASSWORD`：固定密钥。配置后用户输入的密钥必须与其一致；未配置时任意非空密钥均有效（不同密钥的数据互相隔离）
- `SYNC_SALT`：数据隔离命名空间的哈希加盐，防止猜测
- `SITE_PASSWORD`：配置后云同步 API 同时校验站点访问口令 Cookie

### 接口（EdgeOne Cloud Functions）

- `GET /api/sync?key=<密钥>`：列出云端全部简历（含 MD5），并用于密钥验证
- `GET /api/sync/<id>?key=<密钥>`：读取单条云端简历
- `PUT /api/sync/<id>`：推送/覆盖单条简历（body: `{ key, payload }`）
- `DELETE /api/sync/<id>?key=<密钥>`：删除单条云端简历

### 本地开发（EdgeOne）

```bash
npm i -g edgeone@latest
edgeone login
PAGES_SOURCE=skills edgeone makers dev -n <项目名> --skip-env-sync
# 测试 API（注意 sandbox 代理）
curl --noproxy '*' 'http://127.0.0.1:8088/api/sync?key=test'
```

## 访问密码保护

如果你希望对页面访问进行简单的密码保护，可设置环境变量 `SITE_PASSWORD`。当该变量存在且不为空时：
- 用户访问任意页面会先被重定向到 `/auth` 输入密码；
- 验证通过后，服务端会在浏览器写入一个有效期 30 天的 Cookie，后续访问无需再输入；
- 若未配置 `SITE_PASSWORD`，则不启用认证，正常访问。

使用方法：
- 在项目根目录新增或编辑 `.env.local` 文件，加入：

```
SITE_PASSWORD=你的访问密码
```

说明：
- 我们不会在 Cookie 中保存明文密码，而是保存其 SHA-256 摘要；
- 中间件只对页面路由生效，不拦截 `/_next/*`、`/favicon.ico`、`/robots.txt` 以及认证相关路径 `/auth`、`/api/auth`；
- 如需关闭认证，删除或清空 `SITE_PASSWORD` 即可。

## TODO

### 集成 AI 服务
- [ ] 允许用户自定义服务提供商和模型，支持 OpenAI、Anthropic、Gemini等接口类型
- [ ] 结合 Job Description 自动编写、润色、优化、纠错简历
- [ ] 基于简历给出面试准备建议
- [ ] 模拟面试
- [ ] 利用 AI Agent 从网络自动抓取并汇总相似岗位的面经并展示

### 个性化简历样式
- [ ] 提供更多简历模板以供选择，可参考 [novoresume](https://novoresume.com/cv-templates)

### 支持加密远程存储
- [ ] 集成 WebDAV、Google Cloud、OneDrive 等用于数据存储与同步
- [ ] 用户自定义加密密码

## 许可证

MIT
