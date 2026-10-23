/**
 * 浮屿 · 界面风格
 *
 * calm    静海：原来的低对比、衬线、雾海
 * crimson 潮红：红黑剪贴、硬阴影、斜切、半调网点
 * azure   深蓝：蓝黑暗时、冷光、同样的剪贴结构
 *
 * 风格只改变界面；海面、规则与内容不变。
 */

export const STYLE_KEY = "fuyu-style-v1";
export const STYLES = ["calm", "crimson", "azure"];
export const DEFAULT_STYLE = "crimson";

export const STYLE_LABELS = {
  calm: "静海",
  crimson: "潮红",
  azure: "深蓝",
};

export const STYLE_DESCRIPTIONS = {
  calm: "原来的雾海、衬线与留白",
  crimson: "红黑剪贴 · 斜切与硬阴影",
  azure: "蓝黑暗时 · 冷光与硬阴影",
};

const THEME_COLORS = {
  calm: "#060b15",
  crimson: "#120406",
  azure: "#02070d",
};

export function normalizeStyle(value) {
  return STYLES.includes(value) ? value : DEFAULT_STYLE;
}

export function loadStyle() {
  try {
    return normalizeStyle(localStorage.getItem(STYLE_KEY));
  } catch {
    return DEFAULT_STYLE;
  }
}

export function applyStyle(value) {
  const style = normalizeStyle(value);
  document.documentElement.dataset.style = style;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[style]);
  return style;
}

export function saveStyle(value) {
  try {
    localStorage.setItem(STYLE_KEY, normalizeStyle(value));
  } catch {
    /* 隐私模式下不落盘，风格仍然生效 */
  }
}
