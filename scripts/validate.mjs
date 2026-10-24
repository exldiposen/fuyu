#!/usr/bin/env node
/**
 * 内容校验：把 worlds.json 当成一张必须连通的图来检查。
 *   npm run validate
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// 可传入内容文件：node scripts/validate.mjs data/worlds.v2.json
const target = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : fileURLToPath(new URL("../data/worlds.json", import.meta.url));
const data = JSON.parse(readFileSync(target, "utf8"));
console.log(`内容文件：${target.includes("worlds.v2") ? "worlds.v2（九灯）" : "worlds（现行书）"}`);

const errors = [];
const warnings = [];
const ok = [];

const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const MOODS = new Set([
  "prologue", "silent", "windless", "echo", "nameless", "scale",
  "paper", "tide", "vow", "fold", "finale", "chart",
]);
const ENDING_TONES = new Set(["home", "keeper", "drift", "nameless"]);
const SCENE_KEYS = new Set(["text", "choices", "fragment", "note", "learnRule", "echo", "fold", "enter", "ending", "returnLost"]);
const CHOICE_KEYS = new Set(["label", "to", "hint", "requires", "onlyIf", "cost", "takeFragment", "effects", "note", "ending"]);
const REQUIRE_KEYS = new Set(["minFragments", "hasFragments", "flags", "notFlags", "notes", "visited"]);
const WORLD_KEYS = new Set(["id", "name", "en", "whisper", "chart", "chartPos", "center", "requires", "mood", "rule", "start", "scenes"]);

const worlds = Array.isArray(data.worlds) ? data.worlds : [];
if (worlds.length === 0) fail("worlds 数组为空");

const worldById = new Map();
const fragments = new Map();
const notes = new Map();
const endings = new Map();
const flagsProduced = new Set();
const flagsRequired = new Set();
const notesRequired = new Set();

if (!data.meta?.start) fail("meta.start 缺失");

if (!Array.isArray(data.endings) || data.endings.length === 0) {
  fail("endings 缺失");
}
for (const ending of data.endings || []) {
  if (!ending.id) fail("结局缺少 id");
  if (endings.has(ending.id)) fail(`结局 id 重复：${ending.id}`);
  endings.set(ending.id, ending);
  if (!Array.isArray(ending.text) || ending.text.length === 0) {
    fail(`结局 ${ending.id} 没有正文`);
  }
  if (ending.tone && !ENDING_TONES.has(ending.tone)) {
    warn(`结局 ${ending.id} 的 tone 未定义：${ending.tone}`);
  }
}

for (const world of worlds) {
  if (!world.id) fail("岛屿缺少 id");
  if (worldById.has(world.id)) fail(`岛屿 id 重复：${world.id}`);
  worldById.set(world.id, world);

  if (!world.name) fail(`岛屿 ${world.id} 缺少 name`);
  if (!world.scenes || Object.keys(world.scenes).length === 0) {
    fail(`岛屿 ${world.id} 没有场景`);
  }
  if (world.mood && !MOODS.has(world.mood)) {
    warn(`岛屿 ${world.id} 的 mood 未定义：${world.mood}`);
  }
  if (world.chart) {
    if (!Array.isArray(world.chartPos) || world.chartPos.length !== 2) {
      fail(`海图岛屿 ${world.id} 缺少 chartPos`);
    } else if (world.chartPos.some((n) => typeof n !== "number" || n < 0 || n > 100)) {
      fail(`海图岛屿 ${world.id} 的 chartPos 越界`);
    }
  }
  for (const key of Object.keys(world)) {
    if (!WORLD_KEYS.has(key)) warn(`岛屿 ${world.id} 有未识别的字段：${key}`);
  }

  for (const [sceneId, scene] of Object.entries(world.scenes || {})) {
    const where = `${world.id}/${sceneId}`;
    if (!Array.isArray(scene.text) || scene.text.length === 0) {
      fail(`${where} 没有 text`);
    }
    for (const key of Object.keys(scene)) {
      if (!SCENE_KEYS.has(key)) warn(`${where} 有未识别的字段：${key}`);
    }
    if (scene.learnRule && !world.rule) {
      fail(`${where} 标记了 learnRule，但岛屿没有 rule`);
    }
    if (scene.echo && scene.fold) {
      warn(`${where} 同时使用 echo 与 fold，体验可能冲突`);
    }
    if (scene.fragment) {
      const fragment = scene.fragment;
      if (!fragment.id) fail(`${where} 的 fragment 缺少 id`);
      if (fragments.has(fragment.id)) fail(`碎片 id 重复：${fragment.id}`);
      if (!fragment.text) fail(`${where} 的 fragment 缺少 text`);
      if (!Array.isArray(fragment.star) || fragment.star.length !== 2) {
        fail(`${where} 的 fragment 缺少 star 坐标`);
      } else if (fragment.star.some((n) => typeof n !== "number" || n < 0 || n > 100)) {
        fail(`${where} 的 fragment star 越界`);
      }
      fragments.set(fragment.id, { ...fragment, worldId: world.id });
    }
    if (scene.note) {
      if (!scene.note.id) fail(`${where} 的 note 缺少 id`);
      if (notes.has(scene.note.id)) fail(`手记 id 重复：${scene.note.id}`);
      notes.set(scene.note.id, scene.note);
    }
    if (scene.enter?.note) {
      if (!scene.enter.note.id) fail(`${where} 的 enter.note 缺少 id`);
      if (notes.has(scene.enter.note.id)) fail(`手记 id 重复：${scene.enter.note.id}`);
      notes.set(scene.enter.note.id, scene.enter.note);
    }
    for (const flag of scene.enter?.flags || []) flagsProduced.add(flag);
    for (const flag of scene.enter?.clearFlags || []) {
      // clearFlags 只清除已有旗标，不需要生产者
      void flag;
    }

    const choiceLists = [scene.choices || []];
    if (scene.fold?.choices) choiceLists.push(scene.fold.choices);
    for (const choiceList of choiceLists) {
      for (const choice of choiceList) {
        if (!choice.label) fail(`${where} 有一个选项缺少 label`);
        if (!choice.to && !choice.ending) fail(`${where} 的选项「${choice.label}」没有去向`);
        if (choice.to && choice.to !== "#chart" && !world.scenes[choice.to]) {
          fail(`${where} 的选项「${choice.label}」指向不存在的场景：${choice.to}`);
        }
        if (choice.ending && !endings.has(choice.ending)) {
          fail(`${where} 的选项「${choice.label}」指向不存在的结局：${choice.ending}`);
        }
        if (choice.cost != null) {
          if (choice.cost !== 1) fail(`${where} 的 cost 目前只支持 1（${choice.cost}）`);
        }
        if (choice.takeFragment && !fragments.has(choice.takeFragment)) {
          fail(`${where} 的 takeFragment 指向不存在的碎片：${choice.takeFragment}`);
        }
        for (const key of Object.keys(choice)) {
          if (!CHOICE_KEYS.has(key)) warn(`${where} 的选项有未识别字段：${key}`);
        }
        if (choice.effects) {
          for (const flag of choice.effects.flags || []) flagsProduced.add(flag);
          if (choice.effects.note) {
            if (!choice.effects.note.id) fail(`${where} 的 effects.note 缺少 id`);
            if (notes.has(choice.effects.note.id)) fail(`手记 id 重复：${choice.effects.note.id}`);
            notes.set(choice.effects.note.id, choice.effects.note);
          }
        }
        if (choice.note) {
          if (!choice.note.id) fail(`${where} 的选项 note 缺少 id`);
          if (notes.has(choice.note.id)) fail(`手记 id 重复：${choice.note.id}`);
          notes.set(choice.note.id, choice.note);
        }
      }
    }
  }
}

// 所有内容收集完毕之后，再检查条件引用
for (const world of worlds) {
  validateRequires(world.requires, `岛屿 ${world.id}`);
  for (const [sceneId, scene] of Object.entries(world.scenes || {})) {
    const where = `${world.id}/${sceneId}`;
    if (scene.requires) validateRequires(scene.requires, where);
    const choiceLists = [scene.choices || []];
    if (scene.fold?.choices) choiceLists.push(scene.fold.choices);
    for (const list of choiceLists) {
      for (const choice of list) {
        validateRequires(choice.requires, `${where} 的选项「${choice.label}」`);
        validateRequires(choice.onlyIf, `${where} 的选项「${choice.label}」的 onlyIf`);
      }
    }
  }
}

for (const world of worlds) {

  if (!world.scenes?.[world.start]) {
    fail(`岛屿 ${world.id} 的 start 场景不存在：${world.start}`);
    continue;
  }

  // 可达性
  const reachable = new Set();
  const queue = [world.start];
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    const scene = world.scenes[id];
    const lists = [scene.choices || []];
    if (scene.fold?.choices) lists.push(scene.fold.choices);
    for (const list of lists) {
      for (const choice of list) {
        if (choice.to && choice.to !== "#chart" && !reachable.has(choice.to)) {
          queue.push(choice.to);
        }
      }
    }
  }
  for (const sceneId of Object.keys(world.scenes)) {
    if (!reachable.has(sceneId)) fail(`岛屿 ${world.id} 的场景不可达：${sceneId}`);
  }

  // 每条路径都必须能结束：从出口反向可达的场景才是安全的
  const reverse = new Map();
  const terminals = new Set();
  for (const [sceneId, scene] of Object.entries(world.scenes)) {
    if (scene.ending) terminals.add(sceneId);
    const lists = [scene.choices || []];
    if (scene.fold?.choices) lists.push(scene.fold.choices);
    for (const list of lists) {
      for (const choice of list) {
        if (choice.ending || choice.to === "#chart") terminals.add(sceneId);
        if (choice.to && choice.to !== "#chart") {
          if (!reverse.has(choice.to)) reverse.set(choice.to, []);
          reverse.get(choice.to).push(sceneId);
        }
      }
    }
  }
  const finishable = new Set(terminals);
  const backQueue = [...terminals];
  while (backQueue.length) {
    const id = backQueue.shift();
    for (const previous of reverse.get(id) || []) {
      if (!finishable.has(previous)) {
        finishable.add(previous);
        backQueue.push(previous);
      }
    }
  }
  for (const sceneId of Object.keys(world.scenes)) {
    if (!finishable.has(sceneId)) fail(`岛屿 ${world.id} 的场景无法走到出口：${sceneId}`);
  }

  // 出口/终点
  for (const [sceneId, scene] of Object.entries(world.scenes)) {
    const hasChoices = (scene.choices || []).length > 0;
    const hasFold = (scene.fold?.choices || []).length > 0;
    if (!hasChoices && !hasFold && !scene.ending) {
      fail(`岛屿 ${world.id} 的场景既没有选项也没有结局：${sceneId}`);
    }
  }
}

function validateRequires(requires, where) {
  if (!requires) return;
  for (const key of Object.keys(requires)) {
    if (!REQUIRE_KEYS.has(key)) warn(`${where} 的 requires 有未识别字段：${key}`);
  }
  for (const id of requires.hasFragments || []) {
    if (!fragments.has(id)) fail(`${where} 要求不存在的碎片：${id}`);
  }
  for (const flag of [...(requires.flags || []), ...(requires.notFlags || [])]) {
    flagsRequired.add(flag);
  }
  for (const id of requires.notes || []) {
    notesRequired.add(id);
    if (!notes.has(id)) fail(`${where} 要求不存在的手记：${id}`);
  }
  if (typeof requires.minFragments === "number" && requires.minFragments > fragments.size) {
    fail(`${where} 需要 ${requires.minFragments} 块碎片，但全游戏只有 ${fragments.size} 块`);
  }
  if (typeof requires.visited === "number") {
    const chartCount = worlds.filter((w) => w.chart && !w.center).length;
    if (requires.visited > chartCount) {
      fail(`${where} 需要靠岸 ${requires.visited} 座岛，但海图只有 ${chartCount} 座`);
    }
  }
}

// 旗标生产/消费
for (const flag of flagsRequired) {
  if (!flagsProduced.has(flag)) fail(`有选项要求旗标「${flag}」，但没有任何地方设置它`);
}
for (const id of notesRequired) {
  if (!notes.has(id)) fail(`有选项要求手记「${id}」，但它不存在`);
}

// 结局必须被某个选项引用
const referencedEndings = new Set();
for (const world of worlds) {
  for (const scene of Object.values(world.scenes || {})) {
    if (scene.ending) referencedEndings.add(scene.ending);
    const lists = [scene.choices || []];
    if (scene.fold?.choices) lists.push(scene.fold.choices);
    for (const list of lists) {
      for (const choice of list) {
        if (choice.ending) referencedEndings.add(choice.ending);
      }
    }
  }
}
for (const ending of endings.keys()) {
  if (!referencedEndings.has(ending)) fail(`结局「${ending}」没有被任何选项引用`);
}

// 星图
for (const [a, b] of data.constellation?.links || []) {
  if (!fragments.has(a)) fail(`星图连线指向不存在的碎片：${a}`);
  if (!fragments.has(b)) fail(`星图连线指向不存在的碎片：${b}`);
}

// 中央灯塔
const centers = worlds.filter((w) => w.center);
if (centers.length !== 1) fail(`应当恰好有一座中央灯塔，实际有 ${centers.length} 座`);
if (!data.meta?.start || !worldById.has(data.meta.start)) {
  fail(`meta.start 指向不存在的岛屿：${data.meta?.start}`);
}

// 汇总
const sceneCount = worlds.reduce((sum, world) => sum + Object.keys(world.scenes || {}).length, 0);
const chartCount = worlds.filter((w) => w.chart).length;

if (errors.length === 0) {
  ok.push(`结构：${worlds.length} 个世界 / ${chartCount} 座海图岛屿 / ${sceneCount} 个场景`);
  ok.push(`内容：${fragments.size} 块碎片 / ${notes.size} 则手记 / ${endings.size} 个结局`);
  ok.push("连线：所有场景可达，每条路径都能走到出口");
  ok.push("标记：所有碎片、手记、旗标、结局引用都成立");
}

for (const line of ok) console.log(`  ✓ ${line}`);
if (warnings.length) {
  console.log("");
  for (const line of warnings) console.log(`  ! ${line}`);
}
if (errors.length) {
  console.log("");
  for (const line of errors) console.log(`  ✗ ${line}`);
  console.log(`\n内容校验失败：${errors.length} 个问题\n`);
  process.exit(1);
}

console.log(`\n内容校验通过${warnings.length ? `（${warnings.length} 条提醒）` : ""}。\n`);
