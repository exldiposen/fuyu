import { createEngine } from "./engine.js";
import {
  show,
  hide,
  renderScene,
  renderChart,
  renderJournal,
  renderEnding,
  renderTitle,
  renderCostPicker,
  openModal,
  closeModal,
  toast,
} from "./render.js";
import { SeaScene } from "./sea.js";
import { Ambience } from "./audio.js";
import {
  STYLES,
  STYLE_LABELS,
  STYLE_DESCRIPTIONS,
  loadStyle,
  applyStyle,
  saveStyle,
} from "./theme.js";
import {
  loadRun,
  saveRun,
  clearRun,
  hasRun,
  loadMeta,
  recordEnding,
  noteRunStart,
  loadSoundPref,
  saveSoundPref,
} from "./save.js";
import {
  shouldCutIn,
  normalizeCutInMode,
  cutInModeLabel,
  chartHintText,
} from "./flow.js";
import { downloadConstellationChart } from "./share.js";

const CUT_IN_KEY = "fuyu-cutin-v1";

const $ = (selector) => document.querySelector(selector);

const refs = {
  titleScreen: $("#title-screen"),
  gameScreen: $("#game-screen"),
  chartScreen: $("#chart-screen"),
  journalScreen: $("#journal-screen"),
  endingScreen: $("#ending-screen"),

  titleConstellation: $("#title-constellation"),
  titleProgress: $("#title-progress"),
  startBtn: $("#start-btn"),
  continueBtn: $("#continue-btn"),
  helpBtn: $("#help-btn"),

  cutIn: $("#cut-in"),
  cutInWord: $("#cut-in-word"),
  cutInSub: $("#cut-in-sub"),

  islandName: $("#island-name"),
  islandKicker: $("#island-kicker"),
  ruleBadge: $("#rule-badge"),
  ruleCard: $("#rule-card"),
  ruleText: $("#rule-text"),
  scenePlate: $("#scene-plate"),
  sceneText: $("#scene-text"),
  echoHint: $("#echo-hint"),
  foldWrap: $("#fold-wrap"),
  foldBtn: $("#fold-btn"),
  choices: $("#choices"),
  fragmentCount: $("#fragment-count"),
  restartBtn: $("#restart-btn"),
  styleBtn: $("#style-btn"),
  chartBtn: $("#chart-btn"),
  journalBtn: $("#journal-btn"),
  soundBtn: $("#sound-btn"),

  chart: $("#chart"),
  chartHint: $("#chart-hint"),
  chartBackBtn: $("#chart-back-btn"),
  chartJournalBtn: $("#chart-journal-btn"),

  journalTabs: $("#journal-tabs"),
  journalBody: $("#journal-body"),
  journalCloseBtn: $("#journal-close-btn"),

  endingKicker: $("#ending-kicker"),
  endingTitle: $("#ending-title"),
  endingText: $("#ending-text"),
  endingMap: $("#ending-map"),
  endingGlyphs: $("#ending-glyphs"),
  endingStats: $("#ending-stats"),
  endingCollection: $("#ending-collection"),
  endingShareBtn: $("#ending-share-btn"),
  endingRestartBtn: $("#ending-restart-btn"),
  endingJournalBtn: $("#ending-journal-btn"),
  endingTitleBtn: $("#ending-title-btn"),
};

const screens = {
  title: refs.titleScreen,
  game: refs.gameScreen,
  chart: refs.chartScreen,
  journal: refs.journalScreen,
  ending: refs.endingScreen,
};

let data = null;
let allFragments = [];
let links = [];
let allEndings = [];
let engine = null;
let meta = loadMeta();
let sea = null;
let audio = null;

let currentScreen = "title";
let currentTab = "fragments";
let journalReturn = "game";
let chartReadOnly = false;
let lastSceneKey = null;
let lastIslandId = null;
let endingRecorded = null;
let voyageTimer = 0;
let cutInTimer = 0;
let autoAudioPending = loadSoundPref();
let currentStyle = loadStyle();
let cutInMode = loadCutInMode();
applyStyle(currentStyle);

function loadCutInMode() {
  try {
    return normalizeCutInMode(localStorage.getItem(CUT_IN_KEY));
  } catch {
    return "all";
  }
}

function saveCutInMode(mode) {
  cutInMode = normalizeCutInMode(mode);
  try {
    localStorage.setItem(CUT_IN_KEY, cutInMode);
  } catch {
    /* 隐私模式下不落盘，本页仍生效 */
  }
}

/* ------------------------------------------------------------------ */
/* 内容整理                                                            */
/* ------------------------------------------------------------------ */

function collectFragments(worldsData) {
  const seen = new Map();
  for (const world of worldsData.worlds) {
    for (const scene of Object.values(world.scenes || {})) {
      const fragment = scene.fragment;
      if (!fragment?.id || seen.has(fragment.id)) continue;
      seen.set(fragment.id, {
        id: fragment.id,
        text: fragment.text,
        glyph: fragment.glyph || "◇",
        star: fragment.star || [50, 50],
        worldId: world.id,
      });
    }
  }
  return [...seen.values()];
}

/* ------------------------------------------------------------------ */
/* 屏幕与氛围                                                          */
/* ------------------------------------------------------------------ */

function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.classList.toggle("hidden", key !== name);
  }
  document.body.dataset.screen = name;
  currentScreen = name;
}

function applyMood(mood) {
  document.body.dataset.mood = mood;
  sea?.setMood(mood);
  audio?.setMood(mood);
}

function voyage() {
  document.body.classList.remove("voyaging");
  void document.body.offsetWidth;
  document.body.classList.add("voyaging");
  window.clearTimeout(voyageTimer);
  voyageTimer = window.setTimeout(() => {
    document.body.classList.remove("voyaging");
  }, 1200);
}

function cutIn(word, sub = "FUYU", kind = "minor") {
  if (!refs.cutIn) return;
  if (!shouldCutIn(kind, { style: currentStyle, mode: cutInMode })) return;
  refs.cutInWord.textContent = word;
  refs.cutInSub.textContent = sub;
  refs.cutIn.classList.remove("show");
  void refs.cutIn.offsetWidth;
  refs.cutIn.classList.add("show");
  window.clearTimeout(cutInTimer);
  cutInTimer = window.setTimeout(() => {
    refs.cutIn.classList.remove("show");
  }, 1000);
}

function scrollTop(smooth = true) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  window.scrollTo({ top: 0, behavior: smooth && !reduce ? "smooth" : "auto" });
}

/* ------------------------------------------------------------------ */
/* 界面风格                                                            */
/* ------------------------------------------------------------------ */

function updateStyleButtons() {
  document.querySelectorAll("[data-style]").forEach((button) => {
    const active = button.dataset.style === currentStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function setStyle(next) {
  const applied = applyStyle(next);
  if (applied !== currentStyle) {
    currentStyle = applied;
    saveStyle(applied);
    updateStyleButtons();
    toast(`界面 · ${STYLE_LABELS[applied]}`);
  } else {
    updateStyleButtons();
  }
}

function cycleStyle() {
  const index = STYLES.indexOf(currentStyle);
  setStyle(STYLES[(index + 1) % STYLES.length]);
}

function openStyleModal() {
  const body = document.createElement("div");
  body.className = "style-modal";
  const intro = document.createElement("p");
  intro.className = "modal-text";
  intro.textContent = "换一种看法。风格会保存在这台设备上，海面与故事不变。";
  body.append(intro);

  const list = document.createElement("div");
  list.className = "style-modal-list";
  for (const key of STYLES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `style-choice${key === currentStyle ? " active" : ""}`;
    button.dataset.style = key;
    button.setAttribute("aria-pressed", key === currentStyle ? "true" : "false");
    const name = document.createElement("span");
    name.className = "style-choice-name";
    name.textContent = STYLE_LABELS[key];
    const desc = document.createElement("span");
    desc.className = "style-choice-desc";
    desc.textContent = STYLE_DESCRIPTIONS[key];
    button.append(name, desc);
    button.addEventListener("click", () => {
      setStyle(key);
      closeModal();
    });
    list.append(button);
  }
  body.append(list);

  openModal({
    title: "界面风格",
    body,
    actions: [{ label: "取消", kind: "ghost", onClick: closeModal }],
  });
}

/* ------------------------------------------------------------------ */
/* 主渲染                                                              */
/* ------------------------------------------------------------------ */

function render() {
  if (!engine) return;
  const snapshot = engine.snapshot();
  if (snapshot.screen === "ending") {
    showEnding(snapshot);
    return;
  }
  if (snapshot.screen === "chart") {
    showChart(snapshot, false);
    return;
  }
  showGame(snapshot);
}

function showGame(snapshot) {
  const { island } = snapshot;
  if (!island) return;

  applyMood(island.mood);
  document.title = `${island.name} · 浮屿`;
  showScreen("game");

  renderScene(snapshot, {
    ...refs,
    onChoice: choose,
    onLocked: (message) => toast(message || "现在还不行。"),
    onFold: fold,
  });
  refs.scenePlate.dataset.step = String(snapshot.stats.steps + 1).padStart(2, "0");

  if (island.ruleKnown) {
    refs.ruleText.textContent = island.rule;
    show(refs.ruleBadge);
    if (lastIslandId !== island.id) {
      hide(refs.ruleCard);
      refs.ruleBadge.setAttribute("aria-expanded", "false");
    }
  } else {
    hide(refs.ruleBadge);
    hide(refs.ruleCard);
    refs.ruleBadge.setAttribute("aria-expanded", "false");
  }

  updateSoundButton();
  persist();

  const sceneKey = `${island.id}/${snapshot.scene.id}`;
  if (lastSceneKey !== sceneKey) {
    lastSceneKey = sceneKey;
    scrollTop();
    window.setTimeout(() => {
      if (isModalOpen()) return; // 代价选择器打开时，不要抢走焦点
      refs.sceneText.focus({ preventScroll: true });
    }, 60);
  }
  lastIslandId = island.id;
}

function showChart(snapshot, readOnly, options = {}) {
  chartReadOnly = readOnly;
  applyMood("chart");
  showScreen("chart");
  document.title = "海图 · 浮屿";

  renderChart(snapshot, refs, {
    readOnly,
    onTravel: travel,
    onLocked: (message) => toast(message || "雾还没有散。"),
  });

  refs.chartHint.textContent = chartHintText({
    readOnly,
    center: snapshot.chart.find((node) => node.center) || null,
    islands: snapshot.stats.islands,
    totalIslands: snapshot.stats.totalIslands,
  });

  refs.chartBackBtn.textContent = readOnly ? "返回岛屿" : "离开海图";
  updateSoundButton();

  if (options.focus) {
    const heading = refs.chartScreen.querySelector(".chart-head h2");
    heading?.focus({ preventScroll: true });
  }
  if (engine?.screen === "chart") persist();
}

function showEnding(snapshot) {
  const ending = snapshot.ending;
  if (!ending) return;

  if (endingRecorded !== ending.id) {
    endingRecorded = ending.id;
    meta = recordEnding(ending.id, snapshot.fragments.map((fragment) => fragment.id));
    clearRun();
    audio?.chime("ending");
  }

  applyMood(`ending-${ending.tone || "home"}`);
  document.title = `${ending.title} · 浮屿`;
  renderEnding(snapshot, refs, {
    meta,
    allFragments,
    links,
    allEndings,
  });
  showScreen("ending");
  cutIn(ending.title, "ENDING", "ending");
  scrollTop(false);
  refs.endingTitle.tabIndex = -1;
  window.setTimeout(() => refs.endingTitle.focus({ preventScroll: true }), 80);
}

function persist() {
  if (!engine) return;
  if (engine.screen === "ending") return;
  saveRun(engine);
}

/* ------------------------------------------------------------------ */
/* 操作                                                                */
/* ------------------------------------------------------------------ */

function choose(index) {
  if (!engine || engine.screen !== "game") return;
  const before = engine.snapshot();
  const after = engine.choose(index);

  if (after.pendingCost) {
    render();
    openCostPicker(after.pendingCost);
    return;
  }

  const stepped = after.stats.steps > before.stats.steps;
  const gained = after.stats.fragments > before.stats.fragments;
  if (gained) audio?.chime("fragment");
  else if (stepped) audio?.chime("choice");
  else if (after.scene?.echo && after.scene.echoPending === index) audio?.chime("echo");

  render();
  if (gained) cutIn("记忆", "MEMORY", "memory");

  // 回声尚未落下时，把焦点还给同一步，方便键盘再走一次
  if (after.scene?.echo && after.scene.echoPending === index) {
    refs.choices.querySelector(`[data-index="${index}"]`)?.focus();
  }
}

function openCostPicker(pending) {
  const snapshot = engine.snapshot();
  renderCostPicker(snapshot, {
    onPick: (fragmentId) => {
      const modal = $("#modal");
      if (modal) modal._onClose = null;
      closeModal();
      engine.choose(pending.index, { fragmentId });
      audio?.chime("fragment");
      render();
      cutIn("代价", "SACRIFICE", "cost");
    },
    onCancel: () => {
      engine.clearPendingCost();
      render();
      refs.choices.querySelector(`[data-index="${pending.index}"]`)?.focus();
    },
  });
}

function fold() {
  if (!engine) return;
  engine.fold();
  audio?.chime("choice");
  render();
  cutIn("折", "FOLD", "fold");
  refs.choices.querySelector("button")?.focus();
}

function travel(islandId) {
  if (!engine) return;
  const before = engine.snapshot();
  const after = engine.travel(islandId);
  if (after.blocked) {
    toast(after.blocked);
    return;
  }
  if (after.stats.fragments > before.stats.fragments) audio?.chime("fragment");
  audio?.chime("arrival");
  voyage();
  render();
  const kind = before.visited.includes(islandId) ? "arrival" : "arrival-new";
  cutIn(after.island?.name || "靠岸", "ARRIVAL", kind);
}

function startRun() {
  engine = createEngine(data);
  meta = noteRunStart();
  endingRecorded = null;
  lastSceneKey = null;
  lastIslandId = null;
  engine.start();
  lastSceneKey = null;
  voyage();
  render();
  cutIn("起航", "DEPARTURE", "depart");
}

function continueRun() {
  const loaded = loadRun();
  if (!loaded) {
    toast("没有找到可以继续的航行。");
    return;
  }
  engine = createEngine(data);
  engine.restore(loaded.payload);
  endingRecorded = engine.snapshot().ending?.id || null;
  lastSceneKey = null;
  lastIslandId = null;
  voyage();
  render();
  cutIn("接续", "CONTINUE", "continue");
  if (loaded.legacy) {
    toast("已接续 v0.1 的航行。");
  }
}

function openTitle() {
  engine = null;
  chartReadOnly = false;
  applyMood("prologue");
  document.title = "浮屿 · Fuyu";
  showScreen("title");
  renderTitle(refs, { meta, allFragments, links, allEndings });
  updateStyleButtons();
  refs.startBtn.textContent = meta.endings.length ? "再一次起航" : "起航";
  refs.continueBtn.classList.toggle("hidden", !hasRun());
  scrollTop(false);
}

function handleStartClick() {
  if (hasRun()) {
    openModal({
      title: "你有一段未完的航行",
      body: "海图上还留着你的位置。要接着走，还是重新起航？",
      actions: [
        {
          label: "继续航行",
          kind: "primary",
          onClick: () => {
            closeModal();
            continueRun();
          },
        },
        {
          label: "重新开始",
          kind: "ghost",
          onClick: () => {
            closeModal();
            startRun();
          },
        },
        { label: "取消", kind: "ghost", onClick: closeModal },
      ],
    });
    return;
  }
  startRun();
}

function handleRestart() {
  openModal({
    title: "重新起航？",
    body: "这一趟航行会消失。海记得的东西，不会。",
    actions: [
      {
        label: "重新起航",
        kind: "primary",
        onClick: () => {
          closeModal();
          startRun();
        },
      },
      { label: "再想想", kind: "ghost", onClick: closeModal },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* 星图分享                                                            */
/* ------------------------------------------------------------------ */

function shareConstellationChart(title) {
  const snapshot = engine?.snapshot();
  const foundIds = snapshot
    ? snapshot.fragments.map((fragment) => fragment.id)
    : meta.fragments;
  const ok = downloadConstellationChart({
    allFragments,
    foundIds,
    links,
    title: title || "记忆星图",
    subtitle: `记忆 ${foundIds.length} / ${allFragments.length} · 结局 ${meta.endings.length} / ${allEndings.length}`,
  });
  toast(ok ? "星图已带走。去看看下载。" : "这张星图没能带走。");
}

/* ------------------------------------------------------------------ */
/* 海图、日志、结局的往返                                              */
/* ------------------------------------------------------------------ */

function openChartFromGame() {
  if (!engine || engine.screen !== "game") return;
  showChart(engine.snapshot(), true, { focus: true });
}

function chartBack() {
  if (!engine) {
    openTitle();
    return;
  }
  if (chartReadOnly) {
    render();
  } else {
    openTitle();
  }
}

function openJournal(origin) {
  if (!engine) return;
  journalReturn = origin;
  const snapshot = engine.snapshot();
  renderJournal(snapshot, refs, {
    tab: currentTab,
    meta: { ...meta, allEndings },
    allFragments,
    links,
    onShare: () => shareConstellationChart("记忆星图"),
  });
  showScreen("journal");
  document.title = "航海日志 · 浮屿";
  refs.journalTabs.querySelector(`[data-tab="${currentTab}"]`)?.focus();
  scrollTop(false);
}

function closeJournal() {
  const snapshot = engine?.snapshot();
  if (!snapshot) {
    openTitle();
    return;
  }
  if (journalReturn === "ending") {
    showEnding(snapshot);
    return;
  }
  if (journalReturn === "chart") {
    showChart(snapshot, snapshot.screen === "game");
    return;
  }
  render();
}

/* ------------------------------------------------------------------ */
/* 声音                                                                */
/* ------------------------------------------------------------------ */

function updateSoundButton() {
  const on = Boolean(audio?.enabled);
  refs.soundBtn.classList.toggle("active", on);
  refs.soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
  refs.soundBtn.setAttribute("aria-label", on ? "关闭环境声" : "打开环境声");
}

async function toggleSound() {
  if (!audio) return;
  if (!audio.supported) {
    toast("这台设备没有声音。");
    return;
  }
  autoAudioPending = false;
  const on = await audio.toggle();
  saveSoundPref(on);
  updateSoundButton();
  if (on) toast("海的声音回来了。");
  else toast("海安静了下来。");
}

function setupAutoAudio() {
  if (!autoAudioPending) return;
  const resume = async () => {
    if (!autoAudioPending) {
      cleanup();
      return;
    }
    autoAudioPending = false;
    const ok = await audio.enable();
    saveSoundPref(ok);
    updateSoundButton();
    cleanup();
  };
  const cleanup = () => {
    document.removeEventListener("pointerdown", resume);
    document.removeEventListener("keydown", resume);
  };
  document.addEventListener("pointerdown", resume);
  document.addEventListener("keydown", resume);
}

/* ------------------------------------------------------------------ */
/* 帮助                                                                */
/* ------------------------------------------------------------------ */

function buildCutInToggle() {
  const wrap = document.createElement("section");
  wrap.className = "help-section help-cutin";
  const h = document.createElement("h4");
  h.textContent = "转场动画";
  const p = document.createElement("p");
  p.textContent = "潮红与深蓝的漫画式转场。觉得吵的话，可以只留关键时刻。";
  const row = document.createElement("div");
  row.className = "cutin-toggle";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "转场动画频率");
  for (const mode of ["all", "key"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn ghost cutin-option";
    button.dataset.mode = mode;
    button.textContent = cutInModeLabel(mode);
    button.setAttribute("aria-pressed", cutInMode === mode ? "true" : "false");
    button.addEventListener("click", () => {
      saveCutInMode(mode);
      button.blur();
      row.querySelectorAll("[data-mode]").forEach((node) => {
        node.setAttribute("aria-pressed", node.dataset.mode === cutInMode ? "true" : "false");
      });
      toast(`转场 · ${cutInModeLabel(cutInMode)}`);
    });
    row.append(button);
  }
  wrap.append(h, p, row);
  return wrap;
}

function openHelp() {
  const body = document.createElement("div");
  body.className = "help-body";
  const lines = [
    ["怎么航行", "读，观察，然后在关键处做出选择。数字键 1–9 也可以选。"],
    ["规则", "每座岛都藏着一条规则。它不会主动解释自己；看懂它，路才会出现。"],
    ["代价", "有些岛会收走你的一块记忆。被拿走的，不一定永远失去。"],
    ["回声", "有的岛要把同一步走两次。第一次是脚步，第二次才算走过。"],
    ["折页", "有的岛要先把天或海折起来，路才会从折痕里出现。"],
    ["界面风格", "静海 / 潮红 / 深蓝。标题页、页脚的「风格」或 T 键随时切换。"],
    ["快捷键", "1–9 选择 · J 日志 · M 海图 · S 环境声 · T 风格 · Esc 返回 · ? 本页"],
    ["保存", "进度自动保存在这台设备的浏览器里。清理站点数据会把它一起清掉。"],
  ];
  for (const [title, text] of lines) {
    const section = document.createElement("section");
    section.className = "help-section";
    const h = document.createElement("h4");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = text;
    section.append(h, p);
    body.append(section);
  }
  body.append(buildCutInToggle());
  openModal({
    title: "航行须知",
    body,
    actions: [{ label: "知道了", kind: "primary", onClick: closeModal }],
  });
}

/* ------------------------------------------------------------------ */
/* 键盘                                                                */
/* ------------------------------------------------------------------ */

function isModalOpen() {
  const modal = $("#modal");
  return modal && !modal.classList.contains("hidden");
}

function onKeydown(event) {
  if (event.key === "Escape") {
    if (isModalOpen()) {
      closeModal();
      return;
    }
    if (currentScreen === "journal") {
      closeJournal();
      return;
    }
    if (currentScreen === "chart") {
      chartBack();
      return;
    }
    return;
  }

  if (isModalOpen()) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const key = event.key.toLowerCase();

  if (currentScreen === "game" && /^[1-9]$/.test(key)) {
    const button = refs.choices.querySelector(`[data-index="${Number(key) - 1}"]`);
    if (button) {
      button.click();
      event.preventDefault();
    }
    return;
  }

  if (key === "j" && engine && currentScreen !== "title" && currentScreen !== "journal") {
    openJournal(currentScreen === "ending" ? "ending" : currentScreen === "chart" ? "chart" : "game");
    event.preventDefault();
    return;
  }

  if (key === "m" && engine && currentScreen === "game") {
    openChartFromGame();
    event.preventDefault();
    return;
  }

  if (key === "s") {
    toggleSound();
    event.preventDefault();
    return;
  }

  if (key === "t") {
    cycleStyle();
    event.preventDefault();
    return;
  }

  if (key === "?" || key === "h") {
    openHelp();
    event.preventDefault();
  }
}

/* ------------------------------------------------------------------ */
/* 事件接线                                                            */
/* ------------------------------------------------------------------ */

function bind() {
  refs.startBtn.addEventListener("click", handleStartClick);
  refs.continueBtn.addEventListener("click", continueRun);
  refs.helpBtn.addEventListener("click", openHelp);

  document.querySelectorAll(".style-picker [data-style]").forEach((button) => {
    button.addEventListener("click", () => setStyle(button.dataset.style));
  });
  refs.styleBtn.addEventListener("click", openStyleModal);

  refs.chartBtn.addEventListener("click", openChartFromGame);
  refs.journalBtn.addEventListener("click", () => openJournal("game"));
  refs.soundBtn.addEventListener("click", toggleSound);
  refs.restartBtn.addEventListener("click", handleRestart);

  refs.ruleBadge.addEventListener("click", () => {
    const hidden = refs.ruleCard.classList.toggle("hidden");
    refs.ruleBadge.setAttribute("aria-expanded", hidden ? "false" : "true");
  });

  refs.foldBtn.addEventListener("click", fold);

  refs.chartBackBtn.addEventListener("click", chartBack);
  refs.chartJournalBtn.addEventListener("click", () => openJournal("chart"));

  refs.journalCloseBtn.addEventListener("click", closeJournal);
  refs.journalTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    currentTab = button.dataset.tab;
    openJournal(journalReturn);
  });
  refs.journalTabs.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const tabs = [...refs.journalTabs.querySelectorAll("[data-tab]")];
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    next.focus();
    next.click();
    event.preventDefault();
  });

  refs.endingRestartBtn.addEventListener("click", startRun);
  refs.endingShareBtn.addEventListener("click", () => {
    const ending = engine?.snapshot()?.ending;
    shareConstellationChart(ending ? `浮屿 · ${ending.title}` : "记忆星图");
  });
  refs.endingJournalBtn.addEventListener("click", () => openJournal("ending"));
  refs.endingTitleBtn.addEventListener("click", openTitle);

  $("#modal").addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-close]")) closeModal();
  });

  document.addEventListener("keydown", onKeydown);
}

/* ------------------------------------------------------------------ */
/* 启动                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  try {
    // v2《九灯》为默认书；?book=v1 可回到第一本书
    const bookParam = new URLSearchParams(location.search).get("book");
    const bookFile = bookParam === "v1" ? "data/worlds.json" : "data/worlds.v2.json";
    const response = await fetch(bookFile, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.error(error);
    refs.titleProgress.textContent = "海图没能展开。请通过本地服务器访问，并确认 data/worlds.json 存在。";
    hide(refs.startBtn);
    return;
  }

  allFragments = collectFragments(data);
  links = data.constellation?.links || [];
  allEndings = Array.isArray(data.endings) ? data.endings : [];
  meta = loadMeta();

  sea = new SeaScene($("#sea"));
  sea.setMood("prologue");
  sea.play();

  audio = new Ambience();
  audio.setMood("prologue");

  bind();
  updateSoundButton();
  openTitle();
  setupAutoAudio();

  // 开发用跳转钩子：只在 ?debug=1 时存在，方便逐屏检查与贡献者调试内容。
  if (new URLSearchParams(location.search).has("debug")) {
    window.__fuyu = {
      get engine() {
        return engine;
      },
      get data() {
        return data;
      },
      start: startRun,
      style: setStyle,
      cutin(mode) {
        saveCutInMode(mode);
        return cutInMode;
      },
      title: openTitle,
      travel,
      goto(islandId) {
        if (!engine) startRun();
        engine.travel(islandId);
        render();
      },
      choose,
      fold,
      chart() {
        if (!engine) return;
        engine.toChart();
        render();
      },
      journal(tab = "fragments") {
        if (!engine) return;
        currentTab = tab;
        openJournal(engine.screen === "ending" ? "ending" : "game");
      },
      ending(id = "home") {
        if (!engine) startRun();
        engine.state.fragments = collectFragments(data).map((fragment) => ({
          ...fragment,
          returned: false,
        }));
        engine.state.rules = data.worlds.map((world) => world.id);
        const notes = [];
        for (const world of data.worlds) {
          for (const scene of Object.values(world.scenes || {})) {
            if (
              scene.note &&
              ["obs-chart", "obs-deed"].includes(scene.note.id) &&
              !notes.some((note) => note.id === scene.note.id)
            ) {
              notes.push(scene.note);
            }
          }
        }
        engine.state.notes = notes;
        engine.state.visited = data.worlds.filter((world) => world.chart).map((world) => world.id);
        engine.setEnding(id);
        render();
      },
      snapshot: () => engine?.snapshot(),
    };
  }
}

boot();
