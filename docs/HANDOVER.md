# 浮屿 · 交接文档

| 项目 | 值 |
| --- | --- |
| 交接版本 | v2.0.0《九灯》 |
| 线上 | <https://exldiposen.github.io/fuyu/> |
| 仓库 | <https://github.com/exldiposen/fuyu> |
| 状态 | 可玩、已部署；`node --test` 41 个测试通过（v1 31 + v2 10）；GitHub Actions `validate` 通过 |
| 双书 | 默认 `data/worlds.v2.json`《九灯》；`?book=v1` 玩前作《浮屿》（`data/worlds.json`，v1.3 备份另存 `docs/design/backup-worlds-v1.3.json`） |
| v2 设计 | 一切故事 / 美术决定见 [`V2_DESIGN.md`](V2_DESIGN.md)（谜题阶梯、四结局、CG 管线、分期） |

## 0. 先看这三件事

1. **这是零依赖、零构建的静态网页游戏。** 没有 `node_modules`、没有打包步骤；改完文件、刷新页面即可。发布就是把 `master` push 到 GitHub，Pages 自动部署。
2. **故事内容与界面皮肤是分开的。** 故事、规则、碎片、结局全在 `data/worlds.json`；三套界面风格只改 CSS 与少量 DOM 装饰，不改内容。不要为了视觉效果去改剧情数据。
3. **只提交原创内容。** 不搬运任何受版权保护的角色、标志、UI 布局、文本、音乐或图片；不提交真实姓名、住址、账号、密钥、浏览器 profile 等个人信息。截图里只应出现游戏画面。

---

## 1. 项目是什么

《浮屿》是一款中文网页叙事游戏：失忆的旅人漂过九座岛与一座灯塔，理解每座岛“不解释自己”的规则，拾回十块记忆碎片，最后决定要不要回家。

当前内容规模：

| 项目 | 数量 |
| --- | --- |
| 世界（含序章与灯塔） | 11 |
| 场景 | 87 |
| 记忆碎片 | 10 |
| 观察手记 | 27 |
| 结局 | 4（归乡 / 守灯 / 漂流 / 无名） |
| 界面风格 | 3（静海 / 潮红 / 深蓝，默认潮红） |

v1.3 的重点是**内容与回航**：

- 两座新岛：重诺屿（回声 × 代价：许愿要许两遍）、叠浪（折页 × 回声：折起的路要走两遍才踩得实）；
- 结局屏的结局收藏与「带走星图」PNG 导出；
- 存档只存 ID，恢复时从数据重新水化；
- cut-in 频率开关、界面纯逻辑 `src/flow.js`、无障碍补强。

---

## 2. 五分钟跑起来

要求：Node.js >= 20。无需安装依赖。

```bash
# 启动本地静态服务器（推荐）
npm start
# 等价于：
node scripts/serve.mjs

# 打开
# http://127.0.0.1:8000
# 调试入口：
# http://127.0.0.1:8000/?debug=1
```

校验与测试：

```bash
npm run validate     # 内容图校验
npm test             # 19 个测试
```

> **当前 Windows 环境注意**：如果 PowerShell 禁止运行 `npm.ps1`，直接用 Node：
>
> ```powershell
> node scripts/serve.mjs
> node scripts/validate.mjs
> node --test
> ```
>
> 或在允许的情况下使用 `npm.cmd`。不要为了跑 npm 去改系统执行策略，除非你明确知道影响。

项目必须通过 HTTP 访问，不能直接双击 `index.html`（ES Modules 与 `fetch` 会被浏览器安全策略拦截）。

---

## 3. 目录地图

| 路径 | 作用 |
| --- | --- |
| `index.html` | 唯一页面：标题、游戏、海图、日志、结局五个 section，以及 modal / toast / veil / cut-in |
| `assets/style.css` | 基础结构、静海主题、响应式、减少动态 |
| `assets/style-graphic.css` | 潮红 / 深蓝的覆盖层：海报、拼贴、cut-in、钟表、水面 |
| `assets/logo.svg` | 原创灯塔印章 |
| `src/main.js` | 运行时总控：屏幕切换、交互、键盘、存档、音频、主题、cut-in、调试钩子 |
| `src/engine.js` | 纯状态机：旗标、条件、代价、回声、折页、失而复得、结局 |
| `src/flow.js` | 界面流程纯逻辑：cut-in 决策、海图提示、标题进度、结局收藏模型 |
| `src/render.js` | 场景、海图、日志、星图、结局、代价选择器的渲染 |
| `src/share.js` | 记忆星图的 PNG 分享图导出（Canvas 程序化绘制） |
| `src/sea.js` | Canvas 海面、雾、潮汐、灯塔光束、涟漪 |
| `src/audio.js` | Web Audio 合成环境声；无外部音频 |
| `src/save.js` | v2 存档、v0.1 迁移、跨周目 meta、声音偏好 |
| `src/theme.js` | 静海 / 潮红 / 深蓝的切换与持久化 |
| `data/worlds.json` | 全部内容数据与版本号 |
| `scripts/validate.mjs` | 内容图校验：可达性、引用、出口、旗标、星图、灯塔 |
| `scripts/serve.mjs` | 零依赖静态服务器 |
| `tests/engine.test.mjs` | 引擎与完整航线测试 |
| `.github/workflows/validate.yml` | push / PR 自动跑 validate + tests |
| `docs/CONCEPT.md` | 世界观、设计原则、原创边界 |
| `docs/WORLD_RULES.md` | **写新岛前必读**：数据字段、条件、例子、检查清单 |
| `docs/ROADMAP.md` | 版本路线与贡献记录 |
| `docs/CHANGELOG.md` | 版本记录 |
| `docs/screenshots/` | README 使用的 1463×1083 WebP 截图 |
| `.shots/` | 本地截图 profile 与临时产物；**已 gitignore，不要提交** |

---

## 4. 运行时结构

### 4.1 屏幕

`index.html` 中五个主要 section：

- `#title-screen`：标题、风格选择、开始 / 继续；
- `#game-screen`：顶栏、场景面板、选项、页脚；
- `#chart-screen`：七岛 + 灯塔海图；
- `#journal-screen`：记忆 / 规则 / 手记 / 结局；
- `#ending-screen`：结局、星图、统计、再次起航。

`body[data-screen]` 记录当前屏幕；`showScreen()` 负责切换 `.hidden` 与焦点 / 滚动。覆盖层：

- `#veil`：起航 / 靠岸的雾幕；潮红 / 深蓝会变成斜切色幕；
- `#cut-in`：漫画 cut-in；只在潮红 / 深蓝触发；
- `#modal`：代价选择器、帮助、风格选择；
- `#toast`：短提示。

### 4.2 数据流

```text
data/worlds.json
      │
      ▼
createEngine(data) ──► Engine（纯状态，无 DOM）
      │
      ▼
main.js（持有 engine / meta / audio / style）
      │  render()
      ▼
render.js ──► 写 DOM
      │
      ▼
save.js ──► localStorage
```

- `engine.js` 不碰 DOM、不读 localStorage；方便测试。
- `render.js` 只负责“把 snapshot 画出来”，交互回调由 `main.js` 传入。
- `main.js` 是唯一知道“当前屏幕、当前风格、当前音频、当前存档”的地方。
- `sea.js` 与 `audio.js` 是副作用模块；它们不参与游戏规则。

### 4.3 调试钩子

仅当 URL 带 `?debug=1` 时存在 `window.__fuyu`：

```js
__fuyu.start()                 // 新开一局
__fuyu.style("crimson")        // "calm" | "crimson" | "azure"
__fuyu.cutin("key")            // "all" | "key"（cut-in 频率）
__fuyu.title()                 // 回标题
__fuyu.travel("wufeng")        // 走正常靠岸流程（会触发 cut-in / 雾幕）
__fuyu.goto("wufeng")          // 直接跳岛，不触发转场（截图常用）
__fuyu.choose(0)               // 选择当前场景的第 1 个选项
__fuyu.fold()                  // 执行折页
__fuyu.chart()                 // 去海图
__fuyu.journal("fragments")    // "fragments" | "rules" | "notes" | "endings"
__fuyu.ending("home")          // "home" | "keeper" | "drift" | "nameless"
__fuyu.snapshot()              // 当前快照
__fuyu.engine / __fuyu.data    // 只读调试用
```

`goto()` 与 `travel()` 的区别很重要：前者绕过转场，适合快速截图；后者走真实交互，适合检查 cut-in / 雾幕。

---

## 5. 内容模型

**写新岛、改场景、加结局之前，先完整阅读 [`docs/WORLD_RULES.md`](WORLD_RULES.md)。** 那里有最小可玩岛示例、全部字段、条件语法、规则检查清单和提交流程。本节只给交接所需的速查。

### 5.1 顶层结构

```json
{
  "version": "1.2.0",
  "meta": { "title": "浮屿", "start": "xu" },
  "constellation": { "links": [["frag-a", "frag-b"]] },
  "worlds": [],
  "endings": []
}
```

### 5.2 世界 / 场景 / 选项

- 世界：`id`、`name`、`en`、`whisper`、`chart`、`chartPos`、`center`、`requires`、`mood`、`rule`、`start`、`scenes`。
- 场景：`text`（字符串数组）、`choices`、`fragment`、`note`、`learnRule`、`echo`、`fold`、`enter`、`ending`、`returnLost`。
- 选项：`label`、`to`（同岛场景 id 或 `#chart`）、`ending`、`hint`、`requires`、`onlyIf`、`cost`、`takeFragment`、`effects`、`note`。
- 条件：`minFragments`、`hasFragments`、`flags`、`notFlags`、`notes`、`visited`。
- `requires`：不满足时选项仍显示但锁定；`onlyIf`：不满足时选项消失。
- `cost: 1`：让玩家选择一块碎片留在岛上；`takeFragment`：指定碎片。
- `echo: true`：同一步必须点两次；`fold`：先折页才出现另一组选项。
- 每条路最终必须回到 `#chart` 或进入某个结局，否则 `validate` 失败。

### 5.3 内容修改的固定流程

1. 改 `data/worlds.json`；需要时改 `constellation.links`。
2. `node scripts/validate.mjs`。
3. `node --test`。
4. `node scripts/serve.mjs`，用 `?debug=1` 走到改动处。
5. 如果改了界面 / 截图相关，更新 `docs/screenshots/` 与 README。
6. 在 `docs/ROADMAP.md` 的贡献记录里加一行（如果新增岛屿）。
7. 不要提交任何个人信息。

---

## 6. 界面风格与 v1.2 版式

### 6.1 三套风格

| 风格 | `data-style` | 关键词 |
| --- | --- | --- |
| 静海 | `calm` | 雾海、衬线、留白、低对比 |
| 潮红 | `crimson` | 红黑剪贴、硬阴影、斜切、半调网点、贴纸、漫画 cut-in |
| 深蓝 | `azure` | 蓝黑暗时、冷光、钟表、水面涟漪 |

- 默认：`crimson`。
- 切换入口：标题页 `STYLE`、游戏页脚「风格」、键盘 `T`；`?` 帮助里只有风格说明。
- 持久化键：`fuyu-style-v1`。
- `index.html` 的 `<head>` 内联脚本会在首屏绘制前读取风格，避免先闪一下旧皮肤。
- `src/theme.js` 负责 `normalizeStyle / loadStyle / applyStyle / saveStyle`；`applyStyle` 同时更新 `meta[name=theme-color]`。
- CSS 通过 `html[data-style="crimson|azure|calm"]` 切换；基础结构在 `assets/style.css`，潮红 / 深蓝覆盖在 `assets/style-graphic.css`。

### 6.2 桌面版式（v1.2）

| 区域 | 宽度 / 布局 | 备注 |
| --- | --- | --- |
| 标题页 | 80rem，双栏 | 左：文案 / 按钮 / 风格；右：星图海报 |
| 游戏正文 | 46rem | 顶栏 / 场景面板 / 页脚对齐 |
| 海图 | 640px | 桌面居中偏左，与标题 / 提示同宽 |
| 航海日志 | 56rem，双栏 | 左：星图 + 摘要；右：碎片卡片 |
| 结局 | 54rem | 标题 / 星图 / 正文 / 统计 / 按钮 |

关键断点：

- `min-width: 1100px`：上述桌面尺寸；
- `max-width: 900px`：标题页单列，隐藏右海报；
- `max-width: 620px`：手机版式；标题 / 正文进一步压缩。

移动端仍保持单列；不要为了桌面效果把手机宽度写死。

### 6.3 潮红：拼贴与 cut-in

标题海报 `.title-poster` 包含：

- `#title-constellation`：星图；
- `.poster-label`：`THE CHART · 七岛一塔`；
- `.poster-index`：`01`；
- `.poster-vertical`：竖排 `FUYU`；
- `.poster-word`：`归乡` 贴纸；
- `.poster-halftone` 与 `.poster-band`：半调网点与红色斜带（仅潮红显示）；
- `.poster-clock` / `.poster-water`：仅深蓝显示。

游戏场景面板：

- `main.js` 在 `showGame()` 里设置 `refs.scenePlate.dataset.step = 两位场景号`；
- `style-graphic.css` 用 `#scene-plate::after { content: attr(data-step) }` 画幽灵编号；
- 编号只出现在潮红 / 深蓝，静海不显示。

cut-in：

- DOM：`#cut-in`、`#cut-in-word`、`#cut-in-sub`；
- 函数：`main.js` 的 `cutIn(word, sub, kind)`；`kind` 标明触发时刻
  （`depart` / `continue` / `arrival` / `arrival-new` / `memory` / `fold` / `cost` / `ending`）；
- 触发点：起航、接续、靠岸（区分新岛 `arrival-new` 与重复靠岸 `arrival`）、拾回记忆、折页、付出代价、结局；
- 静海不触发（`src/flow.js` 的 `shouldCutIn` 直接返回 false；CSS 也默认隐藏）；
- 频率开关：「航行须知」弹层里的「转场动画」，全部 / 仅靠岸与结局；
  持久化键 `fuyu-cutin-v1`；“仅靠岸与结局”模式只保留 `arrival-new` 与 `ending`；
- 动画约 0.95s，JS 在 1s 后移除 `.show`；
- 若觉得触发时机不对，改 `main.js` 里的调用点或 `flow.js` 里的 `KEY_CUT_IN_KINDS`，不要改 CSS 动画本身。

### 6.4 深蓝：钟表、水面、冷光

- `.poster-clock`：钟面圆环、虚线内圈、时针 / 分针 / 圆心；
- `.poster-water`：三条椭圆涟漪，CSS `g-ripple` 动画；
- `html[data-style="azure"] .title-poster` 的冷色径向渐变；
- cut-in 与高亮使用同一套 `--amber` 冷色变量。

深蓝的方向是“更收敛的冷”，不要再堆红色拼贴；潮红的方向是“更大胆的拼贴”，不要把深蓝的水面 / 钟表加回去。两套风格应该一眼能区分。

### 6.5 静海

- 桌面标题同样是双栏，但右侧是低对比星图，没有 `01` / `归乡` / 钟表 / 水面；
- 没有 cut-in；起航 / 靠岸仍使用原来的雾幕 `#veil`；
- 保留衬线、留白、低对比，不要为了统一而把它做成潮红的黑白版。

### 6.6 原创边界

三套风格受高对比青年向 RPG 的**气质**启发，但没有复制任何作品的角色、标志、UI 布局、文本、音乐或素材。所有图形都是本项目原创的 CSS / Canvas；继续迭代时保持这条线。

---

## 7. 存档、跨周目与偏好

| localStorage key | 内容 |
| --- | --- |
| `fuyu-save-v2` | 当前航行：`v`、`state`（岛、场景、碎片 id 与 returned 标志、失去的碎片 id、手记 id、旗标、规则、已访问、结局、步数、是否在海图） |
| `fuyu-save-v1` | v0.1 旧存档；接续后删除 |
| `fuyu-meta-v1` | 跨周目：抵达过的结局、见过的碎片、开局次数 |
| `fuyu-style-v1` | `calm` / `crimson` / `azure` |
| `fuyu-sound-v1` | 环境声偏好 |
| `fuyu-cutin-v1` | cut-in 频率：`all` / `key` |

- **v1.3 起 v2 存档只存 ID**：碎片存 `{ id, returned }`，失去的碎片与手记只存 id；
  `engine.restore()` 从 `worlds.json` 重新水化正文。改文案后旧存档读到的是新内容；
  引用已消失碎片 / 手记的条目会被静默丢弃（有测试覆盖）。旧 v2 的完整对象形态仍可恢复。
- `save.js` 的所有 localStorage 操作都 catch 异常；隐私模式 / 存储满时游戏仍可继续，只是不落盘。
- `engine.serialize()` 只保存可恢复的状态；`echo`、`folded`、`pendingCost` 不跨刷新保存。
- 旧存档迁移：`restore()` 识别没有 `v` 且带 `worldId/sceneId` 的 v0.1 结构。
- 任何新存档字段都要考虑向后兼容；不要在 `state` 里塞 UI / 主题 / 个人信息。

**不要**把主题、截图、浏览器 profile、本机路径写进存档或仓库。

---

## 8. 测试、校验与截图

### 8.1 必跑

```bash
node scripts/validate.mjs
node --test
```

当前：`validate` 通过；31/31 测试通过。CI 在 `.github/workflows/validate.yml`，push / PR 都会跑。

测试覆盖：序章、静默屿、碎片 / 规则去重、回声、折页、代价、欠账 / 还账、无名渡条件、灯塔解锁、完整航线（含重诺屿与叠浪）、三个结局、存档往返、v0.1 迁移、损坏存档、海图结构、手记 / 规则去重、重诺屿的回声 × 代价、叠浪的折页 × 回声与回头路、存档 ID 水化与旧形态兼容，以及 `src/flow.js` 的全部纯逻辑（cut-in 决策、海图提示、标题进度、结局收藏）。

新增机制时，先在 `tests/engine.test.mjs` 写一条能失败的测试，再改引擎。不要只靠手点。

### 8.2 截图约定

- 统一尺寸：**1463×1083**；导出 WebP，质量 92。
- 截图源文件放 `.shots/`，该目录已被 `.gitignore`；只把最终 WebP 提交到 `docs/screenshots/`。
- 推荐流程：Edge headless + CDP，独立 `--user-data-dir`，`?debug=1`，`Page.captureScreenshot`。
- 截图前**等页面稳定**（2–3 秒）；不要在切换风格后立刻截，headless Edge 偶发把一帧拼成 2×2 瓦片伪影。遇到时重新加载 / 等更久再截，不要以为布局坏了。
- 截图内容只应含游戏画面；不要截到浏览器 UI、桌面、个人信息或本地路径。
- README 当前使用：`title-crimson`、`title-azure`、`title-calm`、`game-crimson`、`game-azure`、`cut-in-crimson`、`chart-crimson`、`journal-crimson`、`paper`、`ending-crimson`。

---

## 9. 发布与网络

### 9.1 发布

- GitHub Pages 直接托管 `master` 根目录；**没有构建步骤**。
- 推送到 `master` 后：
  1. GitHub Actions 跑 `validate` + tests；
  2. Pages 构建 / 部署；
  3. 打开 <https://exldiposen.github.io/fuyu/> 验证。
- 线上通常是 CDN 缓存；看不到新版本时先 `Ctrl+F5`，再等 30–60 秒。

### 9.2 当前环境的推送方式

当前机器曾出现：全局 Git HTTPS 代理指向一个未监听的本地端口，`git push` 走 HTTPS 会失败。**不要修改全局代理配置**；用 SSH 按次推送：

```bash
git -c core.sshCommand="ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" \
  push git@github.com:exldiposen/fuyu.git master --porcelain
```

推送后同步远程跟踪引用：

```bash
git -c core.sshCommand="ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" \
  fetch git@github.com:exldiposen/fuyu.git master:refs/remotes/origin/master
```

然后：

```bash
git status -sb          # 应为 master...origin/master
git log -1 --oneline
git ls-remote git@github.com:exldiposen/fuyu.git refs/heads/master
```

- 不要提交 SSH 私钥、token、凭据或 `.env`。
- 如果新环境没有 SSH key，配置你自己的 GitHub SSH key；不要改仓库 remote 或全局代理来“绕过”。
- `origin` 仍然是 HTTPS URL；上面的命令只是按次覆盖，不改配置。

### 9.3 验证发布

```bash
# CI + Pages 状态
# 用 GitHub API 查 head_sha 对应的 workflow runs
# 线上 HTML 应包含 v1.2 / title-poster
# 线上 CSS 应包含 g-cut-bg / poster-clock
```

当前线上已确认 v1.2。若看到旧版，先强刷；不要急着重推。

---

## 10. 已知问题与边界

1. **静海没有 cut-in**：这是设计，不是遗漏。静海保留雾幕；不要“统一”掉。
2. **截图伪影**：headless Edge 在风格切换后立即截图，偶发 2×2 瓦片；重载 / 等待即可，真实浏览器不受影响。
3. **README 截图仍是 v1.2 的七岛海图**：v1.3 海图已是九岛，`docs/screenshots/` 需要按第 8.2 节流程重拍；优先重拍 `chart-crimson` 与 `title-*`。
4. **字体回退**：不加载外部字体；`Arial Black` / `Impact` / `Microsoft YaHei` 在不同系统上会有字宽差异，属预期。不要为了截图一致引入受版权保护或外部字体。
5. **无 i18n / PWA / 存档导出**：目前只有中文；这些在 v1.4 路线图里，不要假装已经支持。
6. **音频需要用户手势**：浏览器自动播放策略决定；`setupAutoAudio` 已处理首次交互，不要绕过。
7. **localStorage 失败**：隐私模式下不落盘，但游戏仍可玩；这是预期行为。
8. **星图导出用 dataURL**：`share.js` 走 `canvas.toDataURL`；碎片再多也不会超限，但若未来加到几十颗星，考虑换 `toBlob`。
9. **不要在仓库里提交 `.shots/`**：里面有浏览器 profile 和临时截图，已 gitignore；不要为了“方便”把它加进去。

---

## 11. 下一步（按优先级）

### 近期打磨

- 重拍 README 截图（海图与标题页已是九岛版本）。
- 给潮红补一两个“漫画分栏”的场景内装饰（不要过度遮挡正文）。
- 给深蓝补一个更明确的水面 / 钟表视觉锚点（当前主要在标题海报）。
- 屏幕阅读器完整走查：cut-in / modal / ending / journal 的焦点与播报顺序。

### v1.4（路线图）

- 英文内容管线（i18n）；
- 存档导出 / 导入（JSON，不含个人信息）；
- 结局后的“回航”模式；
- PWA 离线缓存与安装入口；
- 1–2 座社区岛与隐藏航线；
- 规则库页面。

**方向建议**：v1.3 把“机制组合”做出来了（回声 × 代价、折页 × 回声）。
下一步优先深化内容与回航体验，不要急着加第四套皮肤或新机制；
重诺屿“押着的结”是跨岛代价链（v2.0）的伏笔，可以顺着它长。

---

## 12. 交接检查清单

- [ ] `git status` 干净；HEAD 是最新提交；`master` 与 `origin/master` 同步。
- [ ] `node scripts/validate.mjs` 通过。
- [ ] `node --test` 31/31 通过。
- [ ] `node scripts/serve.mjs`，检查标题、游戏、海图（九岛）、日志、结局。
- [ ] 三套风格都看一遍：潮红 / 深蓝 / 静海。
- [ ] 桌面 1463×1083 与手机 390×844 各看一遍。
- [ ] 触发一次 cut-in；确认静海不触发；在「航行须知」切到“仅靠岸与结局”再走一遍。
- [ ] 走一次重诺屿（许愿与蹚水两条路）与一次叠浪（含跳下去的回头路）。
- [ ] 结局屏确认结局收藏与「带走星图」下载。
- [ ] 开 `prefers-reduced-motion` 看一遍；不应有长动画。
- [ ] 标题 `STYLE`、页脚「风格」、`T` 键都能切换并持久化。
- [ ] `?debug=1` 的 `goto` / `travel` / `ending` / `cutin` 可用。
- [ ] README 引用的 `docs/screenshots/*.webp` 都存在。
- [ ] 没有 staged 的 `.shots/`、密钥、个人信息、本机路径。
- [ ] push 后 CI `validate` 与 Pages 都是 success；线上强刷验证。
- [ ] 如果改了内容 / 机制，补测试与 `docs/WORLD_RULES.md` / `ROADMAP` 的记录。

---

## 13. 关键文件速查

- 想改**故事 / 岛屿 / 结局** → `data/worlds.json` + [`WORLD_RULES.md`](WORLD_RULES.md)
- 想改**规则 / 条件 / 存档** → `src/engine.js` + `tests/engine.test.mjs`
- 想改**屏幕流程 / 键盘 / cut-in 触发点** → `src/main.js`
- 想改**cut-in 决策 / 海图提示 / 结局收藏的逻辑** → `src/flow.js` + `tests/ui.test.mjs`
- 想改**场景 / 海图 / 日志 / 结局的 DOM** → `src/render.js`
- 想改**星图分享图** → `src/share.js`
- 想改**静海 / 共享布局** → `assets/style.css`
- 想改**潮红 / 深蓝** → `assets/style-graphic.css`
- 想改**风格选择 / 持久化** → `src/theme.js` + `index.html` 内联脚本
- 想改**声音** → `src/audio.js`
- 想改**海面** → `src/sea.js`
- 想改**存档键 / 迁移** → `src/save.js`
- 想改**校验规则** → `scripts/validate.mjs`
- 想改**发布** → `.github/workflows/validate.yml` + GitHub Pages 设置

---

*交接文档结束。改动前先跑一遍校验；不确定的设计方向，先问，不要一次性把三套风格都重做。*
