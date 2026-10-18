import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEngine } from "../src/engine.js";

const data = JSON.parse(
  readFileSync(new URL("../data/worlds.json", import.meta.url), "utf8")
);

function newRun() {
  const engine = createEngine(data);
  engine.start();
  return engine;
}

/** 自动处理回声阶：同一选项点两次才真正走过。 */
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

/**
 * 走完七座岛。refuseScale=true 时在秤星岛拒绝付款，留下欠海的账。
 */
function playAll({ refuseScale = false } = {}) {
  const engine = newRun();

  // 序章
  go(engine, 1); // 摸船板
  go(engine, 0); // 循钟声
  go(engine, 0); // 展开海图
  go(engine, 0); // 合上海图
  assert.equal(engine.screen, "chart");

  // 静默屿
  engine.travel("jingmo");
  go(engine, 1); // 安静地走近
  go(engine, 0); // 跟着雾
  go(engine, 0); // 踏上光路
  go(engine, 0); // 回到海图

  // 无风之海
  engine.travel("wufeng");
  go(engine, 2); // 自己的航迹
  go(engine, 0);
  go(engine, 0);
  go(engine, 0);

  // 回声阶
  engine.travel("huisheng");
  go(engine, 0); // 继续向上（回声）
  go(engine, 1); // 不出声（回声）
  go(engine, 0); // 继续向上
  go(engine, 0); // 接过钟槌
  go(engine, 0); // 走下石阶
  go(engine, 0); // 回到海图

  // 无名渡
  engine.travel("wuming");
  go(engine, 0); // 我为一个人留过灯
  go(engine, 0); // 上船
  go(engine, 0); // 上岸
  go(engine, 0); // 回到海图

  // 秤星岛
  engine.travel("chengxing");
  go(engine, 0); // 问记忆
  go(engine, 0); // 走到秤前
  if (refuseScale) {
    go(engine, 2); // 什么也不放
  } else {
    const pending = engine.choose(0);
    assert.ok(pending.pendingCost, "付费选项应先请求选择一块碎片");
    engine.choose(0, { fragmentId: "frag-scratch" });
  }
  go(engine, 0); // 走过秤
  go(engine, 0); // 走向那棵树
  go(engine, 0); // 离开秤星岛
  go(engine, 0); // 回到海图

  // 纸月
  engine.travel("zhiyue");
  go(engine, 0); // 沿着折痕
  go(engine, 0); // 和它说话
  go(engine, 0); // 按住折痕
  engine.fold();
  go(engine, 0); // 踏上折痕
  go(engine, 0); // 揭下纸人
  go(engine, 0); // 收好纸人
  go(engine, 0); // 回到海图

  // 归潮
  engine.travel("guichao");
  go(engine, 0); // 走近看
  go(engine, 0); // 把它们捡起来
  go(engine, 0); // 走向海滩尽头
  go(engine, 0); // 转身看向海面
  go(engine, 0); // 回到海图

  return engine;
}

function enterFinale(engine) {
  engine.travel("dengta");
  go(engine, 0); // 摸那道划痕
  go(engine, 0); // 继续向上
  go(engine, 0); // 我回来了
  go(engine, 0); // 听他说
  return engine;
}

test("序章：醒来、拾起刻痕、展开海图", () => {
  const engine = newRun();
  assert.equal(engine.screen, "game");
  assert.equal(engine.snapshot().island.id, "xu");
  assert.equal(engine.snapshot().scene.id, "wake");
  assert.equal(engine.snapshot().fragments.length, 0);

  go(engine, 1); // 摸船板
  assert.equal(engine.snapshot().fragments.length, 1);
  assert.equal(engine.snapshot().fragments[0].id, "frag-scratch");

  go(engine, 0); // 钟
  assert.equal(engine.snapshot().notes.length, 1);

  go(engine, 0); // 展开海图
  go(engine, 0); // 合上海图
  assert.equal(engine.screen, "chart");
  assert.equal(engine.snapshot().stats.islands, 0);
});

test("静默屿：理解规则，拿到灯的记忆", () => {
  const engine = newRun();
  engine.travel("jingmo");
  go(engine, 1); // 安静
  go(engine, 0); // 跟着雾
  const snap = engine.snapshot();
  assert.ok(snap.fragments.some((fragment) => fragment.id === "frag-lamp"));
  assert.ok(snap.island.ruleKnown, "拿到碎片时应理解规则");
  assert.match(snap.island.rule, /化作雾/);
  go(engine, 0);
  go(engine, 0);
  assert.equal(engine.screen, "chart");
});

test("碎片与规则不会重复授予", () => {
  const engine = newRun();
  engine.travel("jingmo");
  go(engine, 1);
  go(engine, 0); // s-gift
  assert.equal(engine.snapshot().stats.fragments, 1);
  engine.travel("jingmo"); // 再次靠岸
  go(engine, 1);
  go(engine, 0);
  assert.equal(engine.snapshot().stats.fragments, 1);
  assert.equal(engine.snapshot().rules.length, 1);
});

test("回声阶：同一步必须走两次", () => {
  const engine = newRun();
  engine.travel("huisheng");

  const before = engine.snapshot();
  let after = engine.choose(0);
  assert.equal(after.stats.steps, before.stats.steps);
  assert.equal(after.scene.echoPending, 0);
  assert.equal(after.scene.id, "e-arrive");

  // 换一步：余音落在新的脚步上
  after = engine.choose(1);
  assert.equal(after.scene.echoPending, 1);
  assert.equal(after.scene.id, "e-arrive");

  // 同一一步再走一次：才算走过
  after = engine.choose(1);
  assert.equal(after.scene.id, "e-listen");
  assert.equal(after.stats.steps, before.stats.steps + 1);
  assert.equal(after.scene.echoPending, null);
});

test("纸月：不折页就没有路", () => {
  const engine = newRun();
  engine.travel("zhiyue");
  go(engine, 0);
  go(engine, 0);
  go(engine, 0);
  let snap = engine.snapshot();
  assert.equal(snap.scene.id, "m-press");
  assert.equal(snap.choices.length, 0);
  assert.equal(snap.scene.fold.used, false);

  engine.fold();
  snap = engine.snapshot();
  assert.equal(snap.scene.fold.used, true);
  assert.equal(snap.choices.length, 1);
  assert.match(snap.scene.fold.text.join(""), /月亮沿着你的手指折了过去/);
  go(engine, 0);
  assert.equal(engine.snapshot().scene.id, "m-folded");
});

test("秤星岛：代价会真的拿走一块记忆，归潮再还回来", () => {
  const engine = newRun();
  go(engine, 1); // 刻痕
  engine.travel("chengxing");
  go(engine, 0);
  go(engine, 0);

  const pending = engine.choose(0);
  assert.deepEqual(pending.pendingCost, { index: 0, count: 1 });
  assert.equal(pending.fragments.length, 1);

  const paid = engine.choose(0, { fragmentId: "frag-scratch" });
  assert.equal(paid.scene.id, "c-paid");
  assert.equal(paid.fragments.length, 0);
  assert.equal(paid.lostFragments.length, 1);
  assert.ok(paid.flags.includes("paid_memory"));

  engine.travel("guichao");
  go(engine, 0);
  go(engine, 0);
  const returned = engine.snapshot();
  assert.equal(returned.scene.id, "t-return");
  assert.equal(returned.fragments.length, 1);
  assert.equal(returned.fragments[0].returned, true);
  assert.equal(returned.lostFragments.length, 0);
});

test("秤星岛：没有记忆时，代价选项不会打开选择器", () => {
  const engine = newRun();
  engine.travel("chengxing");
  go(engine, 0);
  go(engine, 0);
  const snap = engine.choose(0);
  assert.equal(snap.pendingCost, null);
  assert.equal(snap.scene.id, "c-scale");
  assert.equal(snap.fragments.length, 0);
});

test("秤星岛：也可以放上被划掉的名字", () => {
  const engine = newRun();
  go(engine, 1); // 刻痕
  engine.travel("chengxing");
  go(engine, 0);
  go(engine, 0);

  const before = engine.snapshot();
  assert.equal(before.choices[1].enabled, true);

  const after = engine.choose(1);
  assert.equal(after.scene.id, "c-name");
  assert.equal(after.fragments.length, 0);
  assert.ok(after.flags.includes("nameless_paid"));
});

test("秤星岛：先欠着，再回来付款，海上的账就清了", () => {
  const engine = newRun();
  go(engine, 1); // 刻痕
  engine.travel("chengxing");
  go(engine, 0);
  go(engine, 0);
  go(engine, 2); // 拒绝付款
  assert.ok(engine.snapshot().flags.includes("owe_sea"));

  engine.travel("chengxing");
  go(engine, 0);
  go(engine, 0);
  const pending = engine.choose(0);
  assert.ok(pending.pendingCost);
  engine.choose(0, { fragmentId: "frag-scratch" });
  const snap = engine.snapshot();
  assert.ok(!snap.flags.includes("owe_sea"));
  assert.ok(snap.flags.includes("paid_memory"));
});

test("无名渡：没有做过事的人会被条件挡住，但仍有一条空手的路", () => {
  const engine = newRun();
  engine.travel("wuming");
  const snap = engine.snapshot();
  assert.equal(snap.choices[0].enabled, false);
  assert.equal(snap.choices[1].enabled, false);
  assert.equal(snap.choices[2].enabled, false);
  assert.equal(snap.choices[3].enabled, true);
  assert.match(snap.choices[0].reason, /还没有想起/);

  go(engine, 3); // 什么都不记得
  assert.ok(engine.snapshot().notes.some((note) => note.id === "obs-ticket"));
});

test("灯塔：至少靠岸四座岛才会从雾里出现", () => {
  const engine = newRun();
  const blocked = engine.travel("dengta");
  assert.equal(blocked.blocked, "雾还没有散。");
  assert.equal(engine.snapshot().island.id, "xu");

  for (const id of ["jingmo", "wufeng", "huisheng", "wuming"]) {
    engine.travel(id);
    engine.toChart();
  }
  assert.equal(engine.snapshot().stats.islands, 4);

  engine.travel("dengta");
  assert.equal(engine.snapshot().island.id, "dengta");
  assert.equal(engine.chartModel().find((node) => node.center).locked, false);
});

test("完整航线：八块碎片，抵达归乡", () => {
  const engine = playAll();
  assert.equal(engine.snapshot().stats.islands, 7);
  assert.equal(engine.snapshot().stats.fragments, 8);
  assert.equal(engine.snapshot().rules.length, 7);

  enterFinale(engine);
  const choice = engine.snapshot();
  assert.equal(choice.scene.id, "f-choice");
  assert.equal(choice.rules.length, 8);
  assert.equal(choice.choices.length, 4);
  assert.equal(choice.choices[0].label, "「回家。」");
  assert.equal(choice.choices[0].enabled, true);

  go(engine, 0);
  const ending = engine.snapshot();
  assert.equal(ending.screen, "ending");
  assert.equal(ending.ending.id, "home");
  assert.equal(ending.stats.fragments, 8);
});

test("欠海的账：拒绝付款后，要先还账才能回家", () => {
  const engine = playAll({ refuseScale: true });
  assert.ok(engine.snapshot().flags.includes("owe_sea"));
  enterFinale(engine);

  let snap = engine.snapshot();
  assert.equal(snap.choices.length, 5);
  assert.equal(snap.choices[0].label, "「先还清欠海的账。」");
  assert.equal(snap.choices[1].label, "「回家。」");
  assert.equal(snap.choices[1].enabled, false);
  assert.match(snap.choices[1].reason, /账/);

  const pending = engine.choose(0);
  assert.ok(pending.pendingCost);
  engine.choose(0, { fragmentId: "frag-lamp" });

  snap = engine.snapshot();
  assert.equal(snap.scene.id, "f-debt");
  assert.ok(!snap.flags.includes("owe_sea"));
  assert.ok(snap.flags.includes("debt_paid"));

  go(engine, 0); // 回到灯下
  snap = engine.snapshot();
  assert.equal(snap.choices[0].label, "「回家。」");
  assert.equal(snap.choices[0].enabled, true);
  go(engine, 0);
  assert.equal(engine.snapshot().ending.id, "home");
});

test("守灯与漂流是另一条路", () => {
  const keeper = playAll();
  enterFinale(keeper);
  go(keeper, 1); // 留下来
  assert.equal(keeper.snapshot().ending.id, "keeper");

  const drift = playAll();
  enterFinale(drift);
  go(drift, 2); // 再出海
  assert.equal(drift.snapshot().ending.id, "drift");
});

test("存档：v2 往返不丢状态", () => {
  const engine = playAll();
  enterFinale(engine);
  go(engine, 0);
  const saved = engine.serialize();

  const restored = createEngine(data);
  restored.restore(saved);
  const snap = restored.snapshot();
  assert.equal(snap.screen, "ending");
  assert.equal(snap.ending.id, "home");
  assert.equal(snap.stats.fragments, 8);
  assert.equal(snap.stats.steps, engine.snapshot().stats.steps);
});

test("存档：v0.1 的静默屿进度可以接续", () => {
  const engine = createEngine(data);
  engine.restore({
    worldId: "jingmo-yu",
    sceneId: "s-gift",
    fragments: [{ id: "frag-lamp", text: "旧存档里的灯" }],
    ruleUnlocked: true,
    finished: false,
  });
  const snap = engine.snapshot();
  assert.equal(snap.screen, "game");
  assert.equal(snap.island.id, "jingmo");
  assert.equal(snap.scene.id, "s-gift");
  assert.equal(snap.fragments[0].glyph, "灯");
  assert.equal(snap.fragments[0].star.length, 2);
  assert.equal(snap.island.ruleKnown, true);
});

test("损坏或陌生的存档会退回海图，而不是崩溃", () => {
  const engine = createEngine(data);
  engine.restore({ v: 2, state: { islandId: "nowhere", sceneId: "x" } });
  assert.equal(engine.screen, "chart");
  engine.restore({ v: 2, state: { islandId: "jingmo", sceneId: "missing" } });
  assert.equal(engine.screen, "chart");
});

test("海图：七座岛加一座灯塔，灯塔默认锁着", () => {
  const engine = newRun();
  const chart = engine.chartModel();
  assert.equal(chart.length, 8);
  assert.equal(engine.snapshot().stats.totalIslands, 7);
  assert.equal(chart.filter((node) => node.center).length, 1);
  assert.equal(chart.find((node) => node.center).locked, true);

  const jingmo = chart.find((node) => node.id === "jingmo");
  assert.ok(jingmo.fragmentId);
  assert.equal(jingmo.collected, false);

  engine.travel("jingmo");
  go(engine, 1);
  go(engine, 0);
  assert.equal(engine.chartModel().find((node) => node.id === "jingmo").collected, true);
});

test("手记与规则都去重", () => {
  const engine = newRun();
  engine.travel("wufeng");
  go(engine, 0); // 雨
  assert.equal(engine.snapshot().notes.length, 1);
  go(engine, 0); // 回静水
  go(engine, 0); // 雨（再次进入同一场景）
  assert.equal(engine.snapshot().notes.length, 1);
});
