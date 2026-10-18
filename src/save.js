/**
 * 浮屿 · 存档
 *
 * v2 存档保存完整航行状态；同时识别 v0.1 的旧存档。
 * 另外维护一份很轻的“跨周目”记录：见过的碎片与抵达过的结局。
 */

export const SAVE_KEY = "fuyu-save-v2";
export const LEGACY_KEY = "fuyu-save-v1";
export const META_KEY = "fuyu-meta-v1";
export const SOUND_KEY = "fuyu-sound-v1";

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // 隐私模式或存储已满：游戏仍然可以继续，只是不落盘
  }
}

export function saveRun(engine) {
  const payload = engine.serialize();
  const ok = writeJSON(SAVE_KEY, payload);
  try {
    localStorage.removeItem(LEGACY_KEY); // v0.1 存档一旦接续就不再需要
  } catch {
    /* ignore */
  }
  const ids = engine.state.fragments.map((f) => f.id);
  rememberFragments(ids);
  return ok;
}

export function loadRun() {
  const current = readJSON(SAVE_KEY);
  if (current) return { payload: current, legacy: false };
  const legacy = readJSON(LEGACY_KEY);
  if (legacy) return { payload: legacy, legacy: true };
  return null;
}

export function clearRun() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function hasRun() {
  return Boolean(loadRun());
}

export function loadMeta() {
  const meta = readJSON(META_KEY);
  return {
    endings: Array.isArray(meta?.endings) ? meta.endings : [],
    fragments: Array.isArray(meta?.fragments) ? meta.fragments : [],
    runs: Number.isFinite(meta?.runs) ? meta.runs : 0,
    seen: Array.isArray(meta?.seen) ? meta.seen : [],
  };
}

export function saveMeta(meta) {
  return writeJSON(META_KEY, meta);
}

export function rememberFragments(ids) {
  if (!ids?.length) return;
  const meta = loadMeta();
  const merged = new Set([...meta.fragments, ...ids]);
  if (merged.size === meta.fragments.length) return;
  meta.fragments = [...merged];
  saveMeta(meta);
}

export function recordEnding(endingId, fragments = []) {
  const meta = loadMeta();
  if (!meta.endings.includes(endingId)) meta.endings.push(endingId);
  if (!meta.seen.includes(endingId)) meta.seen.push(endingId);
  const merged = new Set([...meta.fragments, ...fragments]);
  meta.fragments = [...merged];
  saveMeta(meta);
  return meta;
}

export function noteRunStart() {
  const meta = loadMeta();
  meta.runs += 1;
  saveMeta(meta);
  return meta;
}

export function loadSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

export function saveSoundPref(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}
