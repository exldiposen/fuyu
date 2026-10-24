/**
 * 浮屿 · 界面流程的纯逻辑
 *
 * 这里放“根据状态决定界面说什么、亮什么”的纯函数：
 * 不碰 DOM、不碰 localStorage，方便在 Node 里直接测试。
 * main.js / render.js 负责把这些决定画出来。
 */

/* ------------------------------------------------------------------ */
/* cut-in 转场                                                         */
/* ------------------------------------------------------------------ */

export const CUT_IN_MODES = ["all", "key"];
export const DEFAULT_CUT_IN_MODE = "all";

// “key” 模式下仍然要出现的时刻：第一次靠岸一座新岛、抵达结局。
const KEY_CUT_IN_KINDS = new Set(["arrival-new", "ending"]);

/**
 * @param {"depart"|"continue"|"arrival"|"arrival-new"|"memory"|"fold"|"cost"|"ending"} kind
 * @param {{ style?: string, mode?: string }} [options]
 */
export function shouldCutIn(kind, { style, mode = DEFAULT_CUT_IN_MODE } = {}) {
  if (style === "calm") return false; // 静海永远不触发，这是设计
  if (mode === "key") return KEY_CUT_IN_KINDS.has(kind);
  return true;
}

export function normalizeCutInMode(value) {
  return value === "key" ? "key" : DEFAULT_CUT_IN_MODE;
}

export function cutInModeLabel(mode) {
  return normalizeCutInMode(mode) === "key" ? "仅靠岸与结局" : "全部";
}

/* ------------------------------------------------------------------ */
/* 海图提示                                                            */
/* ------------------------------------------------------------------ */

/**
 * 海图下方那句状态提示。center 是 chartModel 里的灯塔节点（可为 null）。
 * @param {{ readOnly?: boolean, center?: { locked: boolean, visited: boolean } | null,
 *           islands: number, totalIslands: number }} model
 */
export function chartHintText({ readOnly = false, center = null, islands, totalIslands } = {}) {
  const bits = [`已靠岸 ${islands} / ${totalIslands} 座岛。`];
  if (readOnly) {
    bits.unshift("你还在岛上。回到海图之后才能起航。");
  } else if (center?.locked) {
    bits.unshift("灯塔还藏在雾里。至少靠岸四座岛，它才会亮起来。");
  } else if (center && !center.visited) {
    bits.unshift("灯塔亮了。你可以现在就去，也可以先把剩下的岛走完。");
  } else {
    bits.unshift("你回到海图。灯塔仍然亮着。");
  }
  return bits.join(" ");
}

/* ------------------------------------------------------------------ */
/* 标题页进度                                                          */
/* ------------------------------------------------------------------ */

export function titleProgressText({ endingsSeen = 0, endingsTotal = 4, fragmentsSeen = 0, fragmentsTotal = 0 } = {}) {
  const parts = [];
  if (endingsSeen > 0) parts.push(`已抵达 ${endingsSeen} / ${endingsTotal} 个结局`);
  if (fragmentsSeen > 0) parts.push(`点亮 ${fragmentsSeen} / ${fragmentsTotal} 颗记忆之星`);
  if (parts.length === 0) parts.push("海图在雾里，等你展开。");
  return parts.join("　·　");
}

/* ------------------------------------------------------------------ */
/* 结局收藏                                                            */
/* ------------------------------------------------------------------ */

/**
 * 结局屏 / 日志共用的收藏模型：见过的给名字，没见的只给序号。
 * @param {Array<{id: string, kicker: string, title: string}>} allEndings
 * @param {string[]} seenIds
 */
export function endingCollectionModel(allEndings = [], seenIds = []) {
  const seen = new Set(seenIds);
  const items = allEndings.map((ending) => ({
    id: ending.id,
    kicker: ending.kicker || "结局",
    title: seen.has(ending.id) ? ending.title : "？？？",
    seen: seen.has(ending.id),
  }));
  return {
    items,
    total: items.length,
    seen: items.filter((item) => item.seen).length,
    remaining: items.length - items.filter((item) => item.seen).length,
  };
}

export function endingCollectionHint(remaining, total) {
  if (total === 0) return "";
  if (remaining === 0) return `${total} 条航路都走完了。海记得你。`;
  return `还有 ${remaining} 个结局在雾里。换一条路，再航一次。`;
}
