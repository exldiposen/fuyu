import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine } from "../src/engine.js";

const data = JSON.parse(
  readFileSync(new URL("../data/worlds.v2.json", import.meta.url), "utf8")
);

const cgRoot = fileURLToPath(new URL("../assets/cg/", import.meta.url));

function newRun() {
  const engine = createEngine(data);
  engine.start();
  return engine;
}

/** 回声场景：同一选项点两次才走过。 */
function go(engine, index) {
  const before = engine.snapshot();
  let after = engine.choose(index);
  if (
    after.scene?.echo &&
    after.scene.echoPending === index &&
    after.stats.steps === before.stats.steps
  ) {
    after = engine.choose(index);
  }
  return after;
}

/** 走完序章（watch 分支），抵达海图。 */
function throughPrologue(engine) {
  engine.choose(1); // 回头看一眼村子
  engine.choose(0); // 出海
  engine.choose(0); // 贴近胸口
  engine.choose(1); // 什么都不问，先看着她
  engine.choose(0); // 展开航线
  return engine;
}

test("v2 结构：十一世界 / 九岛一塔 / 十碎片 / CG 文件齐全", () => {
  assert.equal(data.worlds.length, 11);
  const chartIslands = data.worlds.filter((w) => w.chart && !w.center);
  assert.equal(chartIslands.length, 9);
  assert.equal(data.worlds.filter((w) => w.center).length, 1);

  const fragmentIds = new Set();
  const cgIds = new Set();
  for (const world of data.worlds) {
    for (const scene of Object.values(world.scenes || {})) {
      if (scene.fragment?.id) fragmentIds.add(scene.fragment.id);
      if (scene.cg) cgIds.add(scene.cg);
    }
  }
  assert.equal(fragmentIds.size, 10);
  for (const ending of data.endings) {
    if (ending.cg) cgIds.add(ending.cg);
  }
  for (const id of cgIds) {
    assert.ok(existsSync(`${cgRoot}cg-${id}.jpg`), `缺少 CG 文件：cg-${id}.jpg`);
  }
});

test("v2 序章：登场名场面的三条分支各留一条线索", () => {
  const branches = [
    { index: 0, note: "obs-new" },
    { index: 1, note: "obs-noshadow" },
    { index: 2, note: "obs-fold" },
  ];
  for (const branch of branches) {
    const engine = newRun();
    engine.choose(1); // 回头看（收灯白手）
    engine.choose(0); // 出海
    engine.choose(0); // 贴近胸口 → 她登场
    assert.ok(engine.snapshot().fragments.some((f) => f.id === "frag-spark"), "登场应授予「火」");
    engine.choose(branch.index);
    const snap = engine.snapshot();
    assert.ok(snap.notes.some((n) => n.id === branch.note), `分支 ${branch.index} 应留下手记 ${branch.note}`);
  }
});

test("v2 完整航线：九岛走遍，抵达拂晓", () => {
  const engine = throughPrologue(newRun());

  // 静语之屿（陪她站）
  engine.travel("jingyu");
  engine.choose(1); engine.choose(0); engine.choose(1);
  engine.choose(0); engine.choose(0); engine.choose(0);

  // 无风之海（没有起点的航迹）
  engine.travel("wufeng");
  engine.choose(2); engine.choose(0); engine.choose(0); engine.choose(0);

  // 回声阶（不出声）
  engine.travel("huisheng");
  go(engine, 0); go(engine, 1); go(engine, 0); engine.choose(0); engine.choose(0);

  // 无名渡（凭「替人保管过一句话」过渡）
  engine.travel("wuming");
  engine.choose(0); engine.choose(0); engine.choose(0); engine.choose(0);

  // 秤星岛（付费过秤）
  engine.travel("chengxing");
  engine.choose(1); engine.choose(0);
  const pending = engine.choose(0);
  assert.ok(pending.pendingCost, "过秤应先请求选择一块碎片");
  engine.choose(0, { fragmentId: "frag-deed" });
  engine.choose(0); engine.choose(0); engine.choose(0); engine.choose(0);

  // 纸月（问她这是在做什么）
  engine.travel("zhiyue");
  engine.choose(0); engine.choose(0); engine.choose(0);
  engine.fold();
  engine.choose(0);
  engine.choose(0); engine.choose(0); engine.choose(0); engine.choose(0);

  // 还潮之湾（问收灯人当年那盏）
  engine.travel("guichao");
  engine.choose(1); engine.choose(0); engine.choose(0);
  engine.choose(0); engine.choose(1); engine.choose(0); engine.choose(0); engine.choose(0);

  // 重诺屿（蹚水）
  engine.travel("chongnuo");
  engine.choose(1); engine.choose(0);
  go(engine, 1);
  engine.choose(0); engine.choose(0); engine.choose(0); engine.choose(0);

  // 叠浪（踩实，不抄近路）
  engine.travel("dielang");
  engine.choose(0);
  engine.fold();
  engine.choose(0);
  go(engine, 0); go(engine, 0); go(engine, 0);
  engine.choose(0); engine.choose(0);

  let snap = engine.snapshot();
  assert.equal(snap.stats.islands, 9);
  assert.equal(snap.stats.fragments, 10, "十块碎片应全部在手（付费的那块已归还）");
  assert.ok(snap.notes.some((n) => n.id === "obs-samefold"), "应见过她叠纸衣");
  assert.ok(snap.notes.some((n) => n.id === "obs-hislamp"), "应听过收灯人的故事");

  // 第一塔：三段仪式
  engine.travel("dengta");
  go(engine, 0); // 叫门两遍
  engine.choose(0); // 到墙边
  engine.fold(); // 影子折成楼梯
  engine.choose(0);
  engine.choose(1); // 摸黑进门
  engine.choose(0); engine.choose(0); // 灯顶 → 真相

  snap = engine.snapshot();
  assert.ok(snap.notes.some((n) => n.id === "obs-truth"), "真相手记应在场");
  engine.choose(0); // 走到灯前
  snap = engine.snapshot();
  assert.equal(snap.choices.filter((c) => c.enabled).length, 4, "四条结局都应可选");

  engine.choose(0); // 拂晓
  snap = engine.snapshot();
  assert.equal(snap.screen, "ending");
  assert.equal(snap.ending.id, "daybreak");
});

test("v2 归还：秤上放下的，退潮时还回来", () => {
  const engine = throughPrologue(newRun());
  engine.travel("chengxing");
  engine.choose(1); engine.choose(0);
  const paid = engine.choose(0, { fragmentId: "frag-spark" });
  assert.equal(paid.lostFragments.length, 1);
  assert.equal(paid.lostFragments[0].id, "frag-spark");

  engine.travel("guichao");
  engine.choose(0); engine.choose(0); // 走近 → 捡起来（returnLost）
  const snap = engine.snapshot();
  assert.equal(snap.lostFragments.length, 0);
  assert.ok(snap.fragments.some((f) => f.id === "frag-spark" && f.returned), "「火」应带着归还标记回来");
});

test("v2 纸月：不折页就没有路；追问要用记忆作薪", () => {
  const engine = throughPrologue(newRun());
  engine.travel("zhiyue");
  engine.choose(0); engine.choose(0); engine.choose(0); // m-press
  let snap = engine.snapshot();
  assert.equal(snap.choices.length, 0, "折页点没有普通选项");
  engine.fold();
  engine.choose(0); // m-inner
  snap = engine.snapshot();
  assert.ok(snap.notes.some((n) => n.id === "obs-samefold"));

  const before = snap.stats.fragments;
  const asked = engine.choose(1, { fragmentId: snap.fragments[0].id });
  assert.equal(asked.stats.fragments, before - 1, "追问应付出一块记忆");
  assert.ok(asked.notes.some((n) => n.id === "obs-names"), "应换到她的秘密");
});

test("v2 回声阶：同一步走两次才算过", () => {
  const engine = throughPrologue(newRun());
  engine.travel("huisheng");
  const before = engine.snapshot().stats.steps;
  let snap = engine.choose(0);
  assert.equal(snap.stats.steps, before, "第一遍只是余音");
  assert.equal(snap.scene.echoPending, 0);
  snap = go(engine, 0);
  assert.ok(snap.stats.steps > before, "第二遍才算走过");
});

test("v2 无名渡：空手的人也有路，凭事的人坐得稳", () => {
  const empty = newRun();
  empty.travel("wuming");
  let snap = empty.snapshot();
  assert.equal(snap.choices[0].enabled, false, "没有任何凭据时，事迹选项应锁定");
  go(empty, 3); // 「我什么都不记得了。」
  assert.ok(empty.snapshot().notes.some((n) => n.id === "obs-ticket"));

  const held = throughPrologue(newRun());
  held.travel("jingyu");
  held.choose(1); held.choose(0); held.choose(1); held.choose(0); held.choose(0); held.choose(0);
  held.travel("wuming");
  snap = held.snapshot();
  assert.equal(snap.choices[0].enabled, true, "持有「钟」碎片后，第一句事迹应可选");
});

test("v2 秤星岛：付账与欠账是两条路", () => {
  const pay = throughPrologue(newRun());
  pay.travel("chengxing");
  pay.choose(1); pay.choose(0);
  pay.choose(0, { fragmentId: "frag-spark" });
  assert.ok(pay.snapshot().flags.includes("paid_memory"));

  const owe = throughPrologue(newRun());
  owe.travel("chengxing");
  owe.choose(1); owe.choose(0);
  owe.choose(1); // 什么也不放
  const snap = owe.snapshot();
  assert.ok(snap.flags.includes("owe_sea"));
  assert.ok(snap.notes.some((n) => n.id === "obs-owe"));
});

test("v2 第一塔：六岛之前锁在雾里；仪式三段都走得到", () => {
  const engine = throughPrologue(newRun());
  const blocked = engine.travel("dengta");
  assert.equal(blocked.blocked, "雾还没有散。");

  for (const id of ["jingyu", "wufeng", "huisheng", "wuming", "chengxing", "zhiyue"]) {
    engine.travel(id);
    engine.toChart();
  }
  engine.travel("dengta");
  assert.equal(engine.snapshot().island.id, "dengta");

  go(engine, 0); // 门要叫两遍
  engine.choose(0);
  engine.fold(); // 影子折成楼梯
  engine.choose(0);
  engine.choose(0, { fragmentId: engine.snapshot().fragments[0].id }); // 芯盒添薪
  assert.ok(engine.snapshot().flags.includes("fed_lamp"));
  engine.choose(0); engine.choose(0); engine.choose(0);
  assert.equal(engine.snapshot().scene.id, "f-choice");
});

test("v2 结局门槛：没见过她的真面目，回不去；没听过他的故事，接不了班", () => {
  // 跳过纸月与还潮的短线：daybreak 与 gloves 都应锁定
  const engine = throughPrologue(newRun());
  for (const id of ["jingyu", "wufeng", "huisheng", "wuming", "chengxing", "zhiyue"]) {
    engine.travel(id);
    engine.toChart();
  }
  // 纸月只走到一半折返，不带 obs-samefold
  engine.travel("dengta");
  go(engine, 0); engine.choose(0); engine.fold(); engine.choose(0);
  engine.choose(0, { fragmentId: engine.snapshot().fragments[0].id });
  engine.choose(0); engine.choose(0); engine.choose(0);

  const snap = engine.snapshot();
  const daybreak = snap.choices.find((c) => c.ending === "daybreak");
  const gloves = snap.choices.find((c) => c.ending === "gloves");
  const fuel = snap.choices.find((c) => c.ending === "fuel");
  const nightwatch = snap.choices.find((c) => c.ending === "nightwatch");
  assert.equal(daybreak.enabled, false, "没见过她叠纸衣，不该能归还");
  assert.equal(gloves.enabled, false, "没听过他的故事，不该能接手套");
  assert.equal(fuel.enabled, true);
  assert.equal(nightwatch.enabled, true);

  engine.choose(fuel.index);
  assert.equal(engine.snapshot().ending.id, "fuel");
});
