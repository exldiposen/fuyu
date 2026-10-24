/**
 * 浮屿 · 界面
 *
 * 这里只做渲染与交互接线，不持有游戏规则。
 */

import { titleProgressText, endingCollectionModel, endingCollectionHint } from "./flow.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const NUMERALS = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];

export function show(element) {
  element?.classList.remove("hidden");
}

export function hide(element) {
  element?.classList.add("hidden");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/* ------------------------------------------------------------------ */
/* 记忆星图                                                            */
/* ------------------------------------------------------------------ */

export function renderConstellation(target, { allFragments, foundIds, links, animate = false }) {
  if (!target) return;
  target.replaceChildren();
  const found = new Set(foundIds || []);
  const byId = new Map(allFragments.map((fragment) => [fragment.id, fragment]));

  const svg = svgEl("svg", {
    viewBox: "0 0 100 100",
    class: "constellation",
    role: "img",
    "aria-label": `记忆星图，已点亮 ${found.size} / ${allFragments.length} 颗星`,
  });

  const defs = svgEl("defs");
  const glow = svgEl("filter", { id: "starGlow", x: "-100%", y: "-100%", width: "300%", height: "300%" });
  const blur = svgEl("feGaussianBlur", { stdDeviation: "1.4", result: "blur" });
  const merge = svgEl("feMerge");
  merge.append(svgEl("feMergeNode", { in: "blur" }), svgEl("feMergeNode", { in: "SourceGraphic" }));
  glow.append(blur, merge);
  defs.append(glow);
  svg.append(defs);

  const linkGroup = svgEl("g", { class: "constellation-links" });
  for (const [a, b] of links || []) {
    const from = byId.get(a);
    const to = byId.get(b);
    if (!from || !to) continue;
    const lit = found.has(a) && found.has(b);
    const line = svgEl("line", {
      x1: from.star[0],
      y1: from.star[1],
      x2: to.star[0],
      y2: to.star[1],
      class: `constellation-link ${lit ? "lit" : "dim"} ${animate && lit ? "animate" : ""}`,
      "vector-effect": "non-scaling-stroke",
    });
    linkGroup.append(line);
  }
  svg.append(linkGroup);

  const starGroup = svgEl("g", { class: "constellation-stars" });
  for (const fragment of allFragments) {
    const [x, y] = fragment.star || [50, 50];
    const lit = found.has(fragment.id);
    const group = svgEl("g", { class: `constellation-star ${lit ? "lit" : "dim"}` });
    const halo = svgEl("circle", { cx: x, cy: y, r: lit ? 4.6 : 2.2, class: "star-halo" });
    const dot = svgEl("circle", {
      cx: x,
      cy: y,
      r: lit ? 1.7 : 0.9,
      class: "star-dot",
      filter: lit ? "url(#starGlow)" : "",
    });
    const title = svgEl("title");
    title.textContent = lit ? fragment.text : "尚未想起";
    group.append(halo, dot, title);
    if (lit && fragment.glyph) {
      const label = svgEl("text", {
        x: x + 3.2,
        y: y - 2.4,
        class: "star-glyph",
      });
      label.textContent = fragment.glyph;
      group.append(label);
    }
    starGroup.append(group);
  }
  svg.append(starGroup);
  target.append(svg);
}

/* ------------------------------------------------------------------ */
/* 场景                                                                */
/* ------------------------------------------------------------------ */

export function renderScene(snapshot, refs) {
  const { island, scene } = snapshot;
  if (!island || !scene) return;

  refs.islandName.textContent = island.name;
  refs.islandKicker.textContent = island.en || "Fuyu";
  refs.sceneText.dataset.echo = scene.echo ? "true" : "false";
  refs.sceneText.classList.toggle("is-folded", Boolean(scene.fold?.used));
  refs.sceneText.classList.remove("replay");
  void refs.sceneText.offsetWidth;
  refs.sceneText.classList.add("replay");

  const paragraphs = scene.fold?.used ? scene.fold.text : scene.text || [];
  const nodes = (paragraphs || []).map((line, index) => {
    const p = el("p", "scene-para");
    p.style.setProperty("--line", String(index));
    p.textContent = line;
    return p;
  });
  refs.sceneText.replaceChildren(...nodes);

  // 规则徽章
  const known = Boolean(island.ruleKnown && island.rule);
  refs.ruleBadge.classList.toggle("hidden", !known);

  // 折页
  if (scene.fold && !scene.fold.used) {
    show(refs.foldWrap);
    refs.foldBtn.textContent = scene.fold.label;
    refs.foldBtn.disabled = false;
  } else {
    hide(refs.foldWrap);
  }

  // 回声提示
  const echoPending = scene.echo && scene.echoPending != null;
  refs.echoHint.classList.toggle("hidden", !echoPending);

  // 选择
  refs.choices.replaceChildren();
  const hasFoldAction = Boolean(scene.fold && !scene.fold.used);
  if (snapshot.choices.length === 0 && !hasFoldAction) {
    const note = el("p", "end-note", "海面很静。这里没有路了。");
    refs.choices.append(note);
  }
  snapshot.choices.forEach((choice) => {
    const button = el("button", "choice");
    button.type = "button";
    button.dataset.index = String(choice.index);
    button.classList.toggle("locked", !choice.enabled);
    button.classList.toggle("echoed", echoPending && scene.echoPending === choice.index);
    button.setAttribute("aria-disabled", choice.enabled ? "false" : "true");
    if (choice.ending) button.dataset.ending = choice.ending;

    const number = el("span", "choice-num", NUMERALS[choice.index] || String(choice.index + 1).padStart(2, "0"));
    const label = el("span", "choice-label", choice.label);
    const meta = [];
    if (choice.cost > 0) meta.push("代价 · 一块记忆");
    if (!choice.enabled && choice.reason) meta.push(choice.reason);
    else if (choice.hint) meta.push(choice.hint);

    button.append(number, label);
    if (meta.length) {
      const metaNode = el("span", "choice-meta");
      metaNode.textContent = meta.join(" · ");
      button.append(metaNode);
    }

    button.addEventListener("click", () => {
      if (!choice.enabled) {
        refs.onLocked?.(choice.reason || "现在还不行。");
        return;
      }
      refs.onChoice?.(choice.index);
    });
    refs.choices.append(button);
  });

  refs.fragmentCount.textContent = `${snapshot.stats.fragments} 块碎片`;
  refs.fragmentCount.setAttribute(
    "aria-label",
    `已收集 ${snapshot.stats.fragments} 块记忆碎片，共 ${snapshot.stats.totalFragments} 块`
  );
}

/* ------------------------------------------------------------------ */
/* 海图                                                                */
/* ------------------------------------------------------------------ */

function chartRoute(from, to, bow = 0) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  return `M ${from.x} ${from.y} Q ${mx + nx * bow} ${my + ny * bow} ${to.x} ${to.y}`;
}

export function renderChart(snapshot, refs, { readOnly = false, onTravel, onLocked } = {}) {
  const chart = snapshot.chart || [];
  const center = chart.find((node) => node.center) || { x: 50, y: 44 };
  const box = refs.chart;
  box.replaceChildren();

  const svg = svgEl("svg", {
    viewBox: "0 0 100 100",
    class: "chart-lines",
    "aria-hidden": "true",
  });

  // 经纬线
  const grid = svgEl("g", { class: "chart-grid" });
  for (let i = 12.5; i < 100; i += 12.5) {
    grid.append(
      svgEl("line", { x1: i, y1: 0, x2: i, y2: 100 }),
      svgEl("line", { x1: 0, y1: i, x2: 100, y2: i })
    );
  }
  svg.append(grid);

  // 航线
  const routes = svgEl("g", { class: "chart-routes" });
  for (const node of chart) {
    if (node.center) continue;
    const path = svgEl("path", {
      d: chartRoute(center, node, node.x < center.x ? -4 : 4),
      class: `chart-route ${node.locked ? "locked" : ""} ${node.visited ? "sailed" : ""}`,
      "vector-effect": "non-scaling-stroke",
    });
    routes.append(path);
  }
  svg.append(routes);

  // 灯塔的光晕
  if (!center.locked) {
    const ring = svgEl("circle", {
      cx: center.x,
      cy: center.y,
      r: 13,
      class: "chart-beacon",
    });
    svg.append(ring);
  }

  // 罗盘
  const compass = svgEl("g", { class: "chart-compass", transform: "translate(8 88)" });
  compass.append(svgEl("circle", { cx: 0, cy: 0, r: 5.4, class: "compass-ring" }));
  compass.append(
    svgEl("path", { d: "M 0 -9 L 1.7 -1.7 L 0 0 L -1.7 -1.7 Z", class: "compass-needle" }),
    svgEl("path", { d: "M 0 9 L 1.5 2 L 0 0 L -1.5 2 Z", class: "compass-needle south" })
  );
  svg.append(compass);

  box.append(svg);

  for (const node of chart) {
    const button = el("button", "chart-node");
    button.type = "button";
    button.dataset.island = node.id;
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    button.classList.toggle("center", node.center);
    button.classList.toggle("locked", node.locked);
    button.classList.toggle("visited", node.visited);
    button.classList.toggle("available", !node.locked && !node.visited);
    button.classList.toggle("current", node.current);
    button.setAttribute("aria-disabled", node.locked ? "true" : "false");

    const mark = el("span", "chart-mark");
    const glyph = el("span", "chart-glyph");
    if (node.center) {
      glyph.textContent = node.locked ? "雾" : "灯";
    } else if (node.visited) {
      glyph.textContent = node.collected ? node.glyph || "✦" : "✦";
    } else {
      glyph.textContent = node.locked ? "·" : "岛";
    }
    mark.append(glyph);
    if (node.current) {
      const boat = el("span", "chart-boat");
      boat.textContent = "⚓";
      mark.append(boat);
    }

    const label = el("span", "chart-label", node.name);
    const whisper = el("span", "chart-whisper");
    if (node.locked) whisper.textContent = "尚未靠近";
    else if (node.center && !node.visited) whisper.textContent = "灯在等你";
    else if (node.visited && !node.collected && !node.center) whisper.textContent = "记忆还没有拾回";
    else whisper.textContent = node.whisper;
    button.append(mark, label, whisper);

    const status = node.locked
      ? `未解锁：${node.lockReason}`
      : node.visited
        ? "已经靠岸"
        : "可以靠岸";
    button.setAttribute("aria-label", `${node.name}，${status}`);

    button.addEventListener("click", () => {
      if (readOnly) {
        onLocked?.("你还在岛上。靠岸之后才能起航。");
        return;
      }
      if (node.locked) {
        onLocked?.(node.lockReason || "雾还没有散。");
        return;
      }
      onTravel?.(node.id);
    });

    box.append(button);
  }
}

/* ------------------------------------------------------------------ */
/* 航海日志                                                            */
/* ------------------------------------------------------------------ */

export function renderJournal(snapshot, refs, { tab = "fragments", meta, allFragments, links, onShare } = {}) {
  refs.journalBody.setAttribute("aria-labelledby", `journal-tab-${tab}`);
  refs.journalTabs.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
    button.setAttribute("aria-selected", button.dataset.tab === tab ? "true" : "false");
  });

  const body = refs.journalBody;
  body.replaceChildren();

  const foundIds = snapshot.fragments.map((fragment) => fragment.id);

  if (tab === "fragments") {
    const map = el("div", "journal-map");
    renderConstellation(map, {
      allFragments,
      foundIds,
      links,
      animate: false,
    });
    const summary = el("p", "journal-summary");
    summary.textContent = `已拾回 ${snapshot.fragments.length} / ${allFragments.length} 块记忆。`;

    const side = el("div", "journal-fragments-side");
    side.append(map, summary);
    if (onShare) {
      const share = el("button", "link journal-share");
      share.type = "button";
      share.textContent = "带走这张星图";
      share.addEventListener("click", onShare);
      side.append(share);
    }

    const list = el("div", "fragment-list");
    for (const fragment of allFragments) {
      const owned = snapshot.fragments.find((item) => item.id === fragment.id);
      const card = el("article", `fragment-card ${owned ? "found" : "missing"}`);
      const seal = el("span", "fragment-seal", owned ? fragment.glyph || "◇" : "·");
      const text = el("div", "fragment-text");
      const title = el("p", "fragment-line", owned ? owned.text : "尚未想起。");
      text.append(title);
      if (owned?.returned) {
        const tag = el("span", "fragment-tag", "海还回来的");
        text.append(tag);
      }
      card.append(seal, text);
      list.append(card);
    }

    const main = el("div", "journal-fragments-main");
    main.append(list);
    const layout = el("div", "journal-fragments");
    layout.append(side, main);
    body.append(layout);
  }

  if (tab === "rules") {
    const learned = snapshot.rules;
    const intro = el("p", "journal-summary");
    intro.textContent = learned.length
      ? `你已经看懂了 ${learned.length} 条世界规则。`
      : "你还没有看懂任何一条规则。规则不会解释自己，只会重复。";
    body.append(intro);

    const list = el("div", "rule-list");
    for (const rule of learned) {
      const item = el("article", "rule-item");
      const name = el("h3", "rule-island", rule.name);
      const quote = el("p", "rule-quote", rule.rule);
      item.append(name, quote);
      list.append(item);
    }
    body.append(list);
  }

  if (tab === "notes") {
    const intro = el("p", "journal-summary");
    intro.textContent = snapshot.notes.length
      ? `手记 ${snapshot.notes.length} 则。它们不一定有用。`
      : "你还没有记下什么。走弯路的时候，也许会有。";
    body.append(intro);

    const list = el("ol", "note-list");
    for (const note of snapshot.notes) {
      const item = el("li", "note-item");
      item.textContent = note.text;
      list.append(item);
    }
    body.append(list);
  }

  if (tab === "endings" && meta) {
    const list = el("div", "ending-collection");
    const allEndings = meta.allEndings || [];
    for (const ending of allEndings) {
      const seen = meta.endings.includes(ending.id);
      const item = el("article", `ending-record ${seen ? "seen" : "unseen"}`);
      const kicker = el("span", "ending-record-kicker", ending.kicker);
      const title = el("h3", "ending-record-title", seen ? ending.title : "未抵达");
      item.append(kicker, title);
      if (!seen) {
        const hint = el("p", "ending-record-hint", "这段航路还没有走到尽头。");
        item.append(hint);
      }
      list.append(item);
    }
    body.append(list);
  }
}

/* ------------------------------------------------------------------ */
/* 结局                                                                */
/* ------------------------------------------------------------------ */

export function renderEnding(snapshot, refs, { meta, allFragments, links, allEndings } = {}) {
  const ending = snapshot.ending;
  if (!ending) return;
  refs.endingKicker.textContent = ending.kicker || "结局";
  refs.endingTitle.textContent = ending.title;

  const prose = refs.endingText;
  prose.replaceChildren();
  for (const [index, line] of (ending.text || []).entries()) {
    const p = el("p", "ending-line");
    p.style.setProperty("--line", String(index));
    p.textContent = line;
    prose.append(p);
  }

  renderConstellation(refs.endingMap, {
    allFragments,
    foundIds: snapshot.fragments.map((fragment) => fragment.id),
    links,
    animate: true,
  });

  const stats = refs.endingStats;
  stats.replaceChildren();
  const entries = [
    ["记忆碎片", `${snapshot.stats.fragments} / ${snapshot.stats.totalFragments}`],
    ["靠岸", `${snapshot.stats.islands} / ${snapshot.stats.totalIslands}`],
    ["手记", `${snapshot.stats.notes}`],
    ["抵达结局", `${meta?.endings?.length || 1} / ${allEndings?.length || 4}`],
  ];
  for (const [label, value] of entries) {
    const item = el("div", "ending-stat");
    item.append(el("span", "ending-stat-label", label), el("span", "ending-stat-value", value));
    stats.append(item);
  }

  const glyphs = refs.endingGlyphs;
  glyphs.replaceChildren();
  for (const fragment of allFragments) {
    const owned = snapshot.fragments.some((item) => item.id === fragment.id);
    const span = el("span", `ending-glyph ${owned ? "lit" : ""}`, owned ? fragment.glyph || "◇" : "·");
    glyphs.append(span);
  }

  // 结局收藏：见过的给名字，没见的留在雾里，拉玩家再航一次
  const collection = refs.endingCollection;
  if (collection) {
    collection.replaceChildren();
    const model = endingCollectionModel(allEndings || [], meta?.endings || []);
    if (model.total > 0) {
      const list = el("div", "ending-collection-list");
      for (const item of model.items) {
        const node = el("article", `ending-collection-item ${item.seen ? "seen" : "unseen"}`);
        node.append(
          el("span", "ending-collection-kicker", item.kicker),
          el("span", "ending-collection-title", item.title)
        );
        list.append(node);
      }
      collection.append(list);
      collection.append(el("p", "ending-collection-hint", endingCollectionHint(model.remaining, model.total)));
    }
  }
}

/* ------------------------------------------------------------------ */
/* 弹层                                                                */
/* ------------------------------------------------------------------ */

export function openModal({ title, body, actions = [], onClose }) {
  const modal = document.getElementById("modal");
  const titleEl = document.getElementById("modal-title");
  const bodyEl = document.getElementById("modal-body");
  const actionsEl = document.getElementById("modal-actions");
  if (!modal) return;

  titleEl.textContent = title;
  bodyEl.replaceChildren();
  if (typeof body === "string") bodyEl.append(el("p", "modal-text", body));
  else if (body) bodyEl.append(body);

  actionsEl.replaceChildren();
  for (const action of actions) {
    const button = el("button", `btn ${action.kind || "ghost"}`, action.label);
    button.type = "button";
    button.addEventListener("click", () => {
      action.onClick?.();
    });
    actionsEl.append(button);
  }

  if (modal._trap) document.removeEventListener("keydown", modal._trap);
  modal._closeToken = (modal._closeToken || 0) + 1;
  modal.classList.remove("hidden");
  modal.dataset.open = "true";
  modal._onClose = onClose;
  modal._restoreFocus = document.activeElement;
  modal._trap = (event) => {
    if (event.key !== "Tab") return;
    const focusables = [...modal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((node) => !node.hasAttribute("disabled") && node.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!modal.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", modal._trap);
  requestAnimationFrame(() => {
    modal.classList.add("visible");
    const focusable = bodyEl.querySelector("button, [tabindex]") || actionsEl.querySelector("button") || titleEl;
    focusable.focus?.();
  });
}

export function closeModal() {
  const modal = document.getElementById("modal");
  if (!modal || modal.classList.contains("hidden")) return;
  if (modal._trap) {
    document.removeEventListener("keydown", modal._trap);
    modal._trap = null;
  }
  const token = (modal._closeToken || 0) + 1;
  modal._closeToken = token;
  modal.classList.remove("visible");
  window.setTimeout(() => {
    if (modal._closeToken !== token) return;
    modal.classList.add("hidden");
    modal.dataset.open = "false";
    const onClose = modal._onClose;
    const restoreFocus = modal._restoreFocus;
    modal._onClose = null;
    modal._restoreFocus = null;
    onClose?.();
    if (restoreFocus?.isConnected) restoreFocus.focus?.();
  }, 180);
}

export function renderCostPicker(snapshot, { onPick, onCancel }) {
  const body = el("div", "cost-picker");
  const hint = el("p", "modal-text", "它会留在秤上。你确定要放下这一块吗？");
  body.append(hint);

  const cancel = () => {
    const modal = document.getElementById("modal");
    if (modal) modal._onClose = null;
    closeModal();
    onCancel();
  };

  const list = el("div", "cost-list");
  if (snapshot.fragments.length === 0) {
    list.append(el("p", "modal-text", "你身上没有可以放下的东西。"));
  }
  snapshot.fragments.forEach((fragment) => {
    const button = el("button", "cost-item");
    button.type = "button";
    const seal = el("span", "cost-seal", fragment.glyph || "◇");
    const text = el("span", "cost-text", fragment.text);
    button.append(seal, text);
    button.addEventListener("click", () => onPick(fragment.id));
    list.append(button);
  });
  body.append(list);

  openModal({
    title: "放上哪一块记忆？",
    body,
    actions: [{ label: "再想想", kind: "ghost", onClick: cancel }],
    onClose: onCancel,
  });
}

export function toast(message, duration = 2600) {
  const node = document.getElementById("toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => {
    node.classList.remove("show");
  }, duration);
}

/* ------------------------------------------------------------------ */
/* 标题页                                                              */
/* ------------------------------------------------------------------ */

export function renderTitle(refs, { meta, allFragments, links, allEndings = [] }) {
  renderConstellation(refs.titleConstellation, {
    allFragments,
    foundIds: meta.fragments,
    links,
    animate: false,
  });

  refs.titleProgress.textContent = titleProgressText({
    endingsSeen: meta.endings.length,
    endingsTotal: allEndings.length || 4,
    fragmentsSeen: allFragments.filter((fragment) => meta.fragments.includes(fragment.id)).length,
    fragmentsTotal: allFragments.length,
  });
}
