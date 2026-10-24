import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldCutIn,
  normalizeCutInMode,
  cutInModeLabel,
  chartHintText,
  titleProgressText,
  endingCollectionModel,
  endingCollectionHint,
} from "../src/flow.js";

/* ------------------------------------------------------------------ */
/* cut-in 转场决策                                                      */
/* ------------------------------------------------------------------ */

test("cut-in：静海永远不触发", () => {
  for (const kind of ["depart", "continue", "arrival", "arrival-new", "memory", "fold", "cost", "ending"]) {
    assert.equal(shouldCutIn(kind, { style: "calm", mode: "all" }), false);
    assert.equal(shouldCutIn(kind, { style: "calm", mode: "key" }), false);
  }
});

test("cut-in：全部模式下，潮红 / 深蓝的每个时刻都触发", () => {
  for (const kind of ["depart", "continue", "arrival", "arrival-new", "memory", "fold", "cost", "ending"]) {
    assert.equal(shouldCutIn(kind, { style: "crimson", mode: "all" }), true);
    assert.equal(shouldCutIn(kind, { style: "azure", mode: "all" }), true);
  }
});

test("cut-in：仅靠岸与结局模式下，只留新岛与结局", () => {
  assert.equal(shouldCutIn("arrival-new", { style: "crimson", mode: "key" }), true);
  assert.equal(shouldCutIn("ending", { style: "azure", mode: "key" }), true);
  for (const kind of ["depart", "continue", "arrival", "memory", "fold", "cost"]) {
    assert.equal(shouldCutIn(kind, { style: "crimson", mode: "key" }), false);
  }
});

test("cut-in：模式值会被归一化，未知值回到全部", () => {
  assert.equal(normalizeCutInMode("key"), "key");
  assert.equal(normalizeCutInMode("all"), "all");
  assert.equal(normalizeCutInMode("nonsense"), "all");
  assert.equal(normalizeCutInMode(null), "all");
  assert.equal(shouldCutIn("memory", { style: "crimson", mode: "nonsense" }), true);
  assert.equal(cutInModeLabel("key"), "仅靠岸与结局");
  assert.equal(cutInModeLabel("all"), "全部");
});

/* ------------------------------------------------------------------ */
/* 海图提示                                                            */
/* ------------------------------------------------------------------ */

test("海图提示：四种状态各自成句，且总带着靠岸进度", () => {
  const base = { islands: 3, totalIslands: 9 };
  assert.match(chartHintText({ ...base, readOnly: true, center: null }), /还在岛上/);
  assert.match(chartHintText({ ...base, readOnly: true, center: null }), /3 \/ 9 座岛/);
  assert.match(chartHintText({ ...base, center: { locked: true, visited: false } }), /灯塔还藏在雾里/);
  assert.match(chartHintText({ ...base, center: { locked: false, visited: false } }), /灯塔亮了/);
  assert.match(chartHintText({ ...base, center: { locked: false, visited: true } }), /灯塔仍然亮着/);
});

/* ------------------------------------------------------------------ */
/* 标题页进度                                                          */
/* ------------------------------------------------------------------ */

test("标题进度：空进度显示起手文案，有进度则拼在一起", () => {
  assert.equal(titleProgressText({}), "海图在雾里，等你展开。");
  assert.equal(
    titleProgressText({ endingsSeen: 2, endingsTotal: 4, fragmentsSeen: 5, fragmentsTotal: 10 }),
    "已抵达 2 / 4 个结局　·　点亮 5 / 10 颗记忆之星"
  );
  assert.equal(titleProgressText({ endingsSeen: 0, endingsTotal: 4, fragmentsSeen: 3, fragmentsTotal: 10 }),
    "点亮 3 / 10 颗记忆之星");
});

/* ------------------------------------------------------------------ */
/* 结局收藏                                                            */
/* ------------------------------------------------------------------ */

test("结局收藏：见过的给名字，没见的留在雾里", () => {
  const endings = [
    { id: "home", kicker: "结局 · 一", title: "归乡" },
    { id: "keeper", kicker: "结局 · 二", title: "守灯" },
    { id: "drift", kicker: "结局 · 三", title: "漂流" },
    { id: "nameless", kicker: "结局 · 四", title: "无名" },
  ];
  const model = endingCollectionModel(endings, ["home", "drift"]);
  assert.equal(model.total, 4);
  assert.equal(model.seen, 2);
  assert.equal(model.remaining, 2);
  assert.equal(model.items[0].title, "归乡");
  assert.equal(model.items[1].title, "？？？");
  assert.equal(model.items[1].seen, false);

  assert.match(endingCollectionHint(model.remaining, model.total), /还有 2 个结局在雾里/);
  assert.match(endingCollectionHint(0, 4), /都走完了/);
  assert.equal(endingCollectionHint(0, 0), "");
});
