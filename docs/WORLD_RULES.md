# 如何为《浮屿》写一座新岛

岛屿内容全部存放在 `data/worlds.json`，是纯数据，不需要会写代码也能参与。
v1.0 的格式比 v0.1 多了规则机制：条件、代价、回声、折页、失而复得、结局。

> 本文含内容结构说明，也含轻微剧透。建议先通关一次，再回来写岛。

## 一个最小、完整、可校验的岛

把下面这个对象追加到 `data/worlds.json` 的 `worlds` 数组里，它就成了一座可玩的岛。
（这是一个示例，不会自动出现在游戏里。）

```json
{
  "id": "wu-zhong-zhan",
  "name": "雾中站",
  "en": "The Fog Station",
  "whisper": "一列只在雾里停靠的车",
  "chart": true,
  "chartPos": [50, 88],
  "mood": "nameless",
  "rule": "这座岛的车只在有人等的时候停。",
  "start": "arrive",
  "scenes": {
    "arrive": {
      "text": [
        "雾里有一段月台，没有站名。",
        "铁轨从雾里来，又回到雾里去。你听见很远的地方有车轮声。"
      ],
      "choices": [
        { "label": "站到月台上等", "to": "wait" },
        { "label": "沿着铁轨走", "to": "walk" }
      ]
    },
    "walk": {
      "text": [
        "你沿着铁轨走。铁轨很凉，雾里有铁锈的味道。",
        "走了很久，你发现自己又回到了月台。"
      ],
      "note": {
        "id": "obs-tracks",
        "text": "铁轨上只有一行脚印，是你自己的。"
      },
      "choices": [
        { "label": "回到月台", "to": "wait" }
      ]
    },
    "wait": {
      "text": [
        "你站在月台上，什么也没做。",
        "车轮声近了。一列车从雾里滑出来，停在你面前。车门开着，像有人替你留着。",
        "你上车时，座位还是温的。"
      ],
      "fragment": {
        "id": "frag-wait",
        "text": "有人在等我。我一直在等那个人。",
        "glyph": "等",
        "star": [50, 92]
      },
      "learnRule": true,
      "choices": [
        { "label": "回到海图", "to": "#chart" }
      ]
    }
  }
}
```

然后：

1. 在 `data/worlds.json` 的 `constellation.links` 里加一条连线（可选，但推荐）：
   `["frag-name", "frag-wait"]`。
2. 运行 `npm run validate` 与 `npm test`。
3. 运行 `npm start`，打开 <http://127.0.0.1:8000/?debug=1>，
   在控制台执行 `__fuyu.goto("wu-zhong-zhan")` 直接跳到这座岛。

## 世界（岛屿）字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 唯一英文 id，如 `wu-feng-zhi-hai` |
| `name` | 是 | 中文岛名 |
| `en` | 否 | 英文名，显示在场景顶部 |
| `whisper` | 否 | 海图上的一句氛围提示，不剧透规则 |
| `chart` | 否 | `true` 表示出现在海图上 |
| `chartPos` | 海图岛必填 | `[x, y]`，0–100，海图上的位置 |
| `center` | 否 | `true` 表示中央灯塔；全游戏只能有一座 |
| `requires` | 否 | 上岛条件，如 `{ "visited": 4 }` 表示至少靠岸四座岛 |
| `mood` | 否 | 海面氛围：`prologue` `silent` `windless` `echo` `nameless` `scale` `paper` `tide` `finale` |
| `rule` | 是* | 这座岛的规则，一句话写清，克制、不解释 |
| `start` | 是 | 起始场景 id |
| `scenes` | 是 | 场景表，见下 |

\* 如果任何场景写了 `"learnRule": true`，`rule` 必填。

## 场景字段

| 字段 | 说明 |
| --- | --- |
| `text` | **字符串数组**，每个元素是一个段落 |
| `choices` | 选项数组；没有选项也没有 `fold` 的场景必须带 `ending` |
| `fragment` | 进入时获得一块碎片：`{ id, text, glyph, star }` |
| `note` | 进入时获得一则手记：`{ id, text }` |
| `learnRule` | 进入时点亮这座岛的规则 |
| `echo` | 回声场景：所有选项都要点两次才算走过 |
| `fold` | 折页：`{ label, text, choices }`，用按钮把场景折起来后出现另一组文字与选项 |
| `enter` | 进入时设置状态：`{ flags: [], clearFlags: [], note: {...} }` |
| `ending` | 进入时直接进入某个结局 id |
| `returnLost` | 进入时把之前失去的碎片全部还回来 |

### 关于 `echo`

在 `echo: true` 的场景里，玩家第一次点某个选项只会留下“余音”，再点同一个选项
才会真正走过。换一个选项会改变余音落在哪里。适合“重复才算数”的规则。

### 关于 `fold`

`fold` 场景可以没有普通 `choices`。页面会显示 `label` 按钮；点下后，
场景换成 `fold.text`，并显示 `fold.choices`。适合“折一下世界”的规则。

## 选项字段

| 字段 | 说明 |
| --- | --- |
| `label` | 选项文字 |
| `to` | 同一座岛的场景 id；或特殊目的地 `"#chart"`（回到海图） |
| `ending` | 直接进入结局 id（与 `to` 二选一） |
| `hint` | 选项下方的补充说明 |
| `requires` | 条件；不满足时选项**仍然显示**，但会锁定并给出理由 |
| `onlyIf` | 条件；不满足时选项**整个消失** |
| `cost` | `1`：要求玩家选择一块碎片留在岛上（会真的从碎片列表移除） |
| `takeFragment` | 移除指定的碎片 id |
| `effects` | `{ flags: [], clearFlags: [], note: {...}, learnRule: true }` |
| `note` | 选择后获得手记（等价于 `effects.note`） |

### 条件 `requires` / `onlyIf`

两者结构相同：

```json
{
  "minFragments": 6,
  "hasFragments": ["frag-lamp", "frag-name"],
  "flags": ["named"],
  "notFlags": ["owe_sea"],
  "notes": ["obs-chart"],
  "visited": 4
}
```

- `minFragments`：至少持有多少块碎片。
- `hasFragments`：必须持有这些碎片（全部满足）。
- `flags` / `notFlags`：旗标必须存在 / 必须不存在。
- `notes`：必须已经获得这些手记。
- `visited`：至少靠岸多少座**海图岛屿**（不含灯塔）。

`requires` 用于“看得见但走不通”，`onlyIf` 用于“条件不成立就完全不出现”。
灯塔下“先还清欠海的账”就用了 `onlyIf: { "flags": ["owe_sea"] }`。

## 碎片、手记与星图

- 碎片 id 全局唯一；`star` 是星图坐标 `[x, y]`，0–100。
- 一个世界通常只放一块碎片，由该岛的核心场景授予。
- 手记 id 全局唯一；它不进入主线，只记录“看见过的事”。
- 星图连线写在 `data/worlds.json` 顶层的 `constellation.links` 里，
  每条线是两个碎片 id。没被点亮的星以暗点显示。
- 新碎片若不连线，仍然会出现在星图里，只是孤立。

## 结局

结局写在顶层 `endings`：

```json
{
  "id": "home",
  "kicker": "结局 · 一",
  "title": "归乡",
  "tone": "home",
  "text": ["第一段。", "第二段。"]
}
```

- `tone` 决定结局页的海面色调：`home` `keeper` `drift` `nameless`。
- 结局必须被某个选项或场景引用，否则校验会失败。
- 目前有四种结局；新增结局时，请同时考虑它与碎片数量、旗标的关系。

## 一条好规则的检查清单

- [ ] 一句话能说清，不需要额外解释
- [ ] 与这座岛的故事互为因果（规则是故事的形状，不是装饰）
- [ ] 玩家可以靠自己观察出来，而不是被直接告知
- [ ] 至少有一个“没理解规则”的弯路场景，让走错本身成为提示
- [ ] 规则至少改变一种操作、资源或路径（见 `CONCEPT.md`）
- [ ] 碎片内容关乎“我是谁 / 家在哪”，而不是解释剧情
- [ ] 每条路最终都能回到海图或走到结局
- [ ] 没有搬运任何受版权保护的内容，也没有任何个人信息

## 提交前

```bash
npm run validate   # 场景可达、引用成立、每条路都能走到出口
npm test           # 引擎与完整航线的测试
npm start          # 本地试玩
```

`npm run validate` 会检查：

- 世界、场景、碎片、手记、结局的 id 是否唯一；
- 每个选项的 `to` / `ending` 是否存在；
- 每个场景是否从起始场景可达；
- 每条路径是否都能走到 `#chart` 或某个结局；
- `requires` / `onlyIf` 引用的碎片、手记、旗标是否真的存在；
- 星图连线是否指向存在的碎片；
- 是否恰好有一座中央灯塔；
- 未识别的字段也会给出提示。

## 提交流程

1. Fork 本仓库
2. 在 `data/worlds.json` 的 `worlds` 数组中追加一座岛
3. 在 `constellation.links` 里为它的碎片加线（可选）
4. 在 `docs/ROADMAP.md` 的贡献记录里加一行
5. 提 Pull Request，说明：岛名、规则、你想让玩家感受到什么、
   以及这条规则改变了哪一种操作 / 资源 / 路径

Review 时我们会重点看：规则是否自洽、氛围是否到位、碎片是否动人，
以及这条规则是不是“可以被玩到”。

> 请只提交原创内容。不要提交任何真实姓名、住址、账号或其他隐私信息。
