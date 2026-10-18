/**
 * 浮屿 · 航行引擎
 *
 * 纯状态机，不碰 DOM。所有内容来自 data/worlds.json。
 * 机制：旗标、条件、碎片代价、回声确认、折页、失而复得、结局。
 */

export const SAVE_VERSION = 2;

const CHART = "#chart";

export function createEngine(data) {
  return new Engine(data);
}

class Engine {
  constructor(data) {
    if (!data || !Array.isArray(data.worlds)) {
      throw new Error("worlds.json 缺少 worlds 数组");
    }
    this.data = data;
    this.worldById = new Map(data.worlds.map((w) => [w.id, w]));
    this.endings = Array.isArray(data.endings) ? data.endings : [];

    this.state = {
      islandId: null,
      sceneId: null,
      fragments: [],
      lost: [],
      notes: [],
      flags: [],
      rules: [],
      visited: [],
      echo: null,
      folded: false,
      ending: null,
      pendingCost: null,
      steps: 0,
      atChart: false,
    };
  }

  /* ------------------------------------------------------------------ */
  /* 查询                                                                */
  /* ------------------------------------------------------------------ */

  get world() {
    return this.worldById.get(this.state.islandId) || null;
  }

  get scene() {
    const world = this.world;
    if (!world || !this.state.sceneId) return null;
    return world.scenes[this.state.sceneId] || null;
  }

  get ending() {
    if (!this.state.ending) return null;
    return this.endings.find((e) => e.id === this.state.ending) || null;
  }

  get screen() {
    if (this.state.ending) return "ending";
    if (this.state.atChart || !this.state.islandId) return "chart";
    return "game";
  }

  hasFlag(flag) {
    return this.state.flags.includes(flag);
  }

  hasFragment(id) {
    return this.state.fragments.some((f) => f.id === id);
  }

  get chartedWorlds() {
    return this.data.worlds.filter((w) => w.chart);
  }

  get chartedVisited() {
    return this.state.visited.filter((id) => {
      const world = this.worldById.get(id);
      return world?.chart && !world.center;
    }).length;
  }

  get totalFragments() {
    const ids = new Set();
    for (const world of this.data.worlds) {
      for (const scene of Object.values(world.scenes || {})) {
        if (scene.fragment?.id) ids.add(scene.fragment.id);
      }
    }
    return ids.size;
  }

  get totalNotes() {
    const ids = new Set();
    for (const world of this.data.worlds) {
      for (const scene of Object.values(world.scenes || {})) {
        if (scene.note?.id) ids.add(scene.note.id);
        if (scene.enter?.note?.id) ids.add(scene.enter.note.id);
        for (const choice of scene.choices || []) {
          const note = choice.effects?.note || choice.note;
          if (note?.id) ids.add(note.id);
        }
      }
    }
    return ids.size;
  }

  fragmentById(id) {
    for (const world of this.data.worlds) {
      for (const scene of Object.values(world.scenes || {})) {
        if (scene.fragment?.id === id) return scene.fragment;
      }
    }
    return null;
  }

  worldFragment(world) {
    for (const scene of Object.values(world.scenes || {})) {
      if (scene.fragment) return scene.fragment;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 条件                                                                */
  /* ------------------------------------------------------------------ */

  checkRequires(requires) {
    if (!requires) return { ok: true };
    const { state } = this;

    if (requires.minFragments != null && state.fragments.length < requires.minFragments) {
      return { ok: false, reason: "记忆还不够。" };
    }
    if (Array.isArray(requires.hasFragments)) {
      const missing = requires.hasFragments.some((id) => !this.hasFragment(id));
      if (missing) return { ok: false, reason: "你还没有想起那件事。" };
    }
    if (Array.isArray(requires.flags)) {
      if (!requires.flags.every((f) => this.hasFlag(f))) {
        return { ok: false, reason: "你还没有走到那一步。" };
      }
    }
    if (Array.isArray(requires.notFlags)) {
      if (requires.notFlags.some((f) => this.hasFlag(f))) {
        return { ok: false, reason: "有一笔账还没清。" };
      }
    }
    if (Array.isArray(requires.notes)) {
      if (!requires.notes.every((id) => state.notes.some((n) => n.id === id))) {
        return { ok: false, reason: "你还没有看见那件事。" };
      }
    }
    if (requires.visited != null && this.chartedVisited < requires.visited) {
      return { ok: false, reason: "雾还没有散。" };
    }
    return { ok: true };
  }

  canTravel(islandId) {
    const world = this.worldById.get(islandId);
    if (!world) return { ok: false, reason: "海图上没有这座岛。" };
    return this.checkRequires(world.requires);
  }

  /* ------------------------------------------------------------------ */
  /* 航行                                                                */
  /* ------------------------------------------------------------------ */

  start() {
    return this.travel(this.data.meta?.start || this.data.worlds[0]?.id);
  }

  travel(islandId) {
    const world = this.worldById.get(islandId);
    if (!world) throw new Error(`未知的岛：${islandId}`);
    const gate = this.canTravel(islandId);
    if (!gate.ok) return { ...this.snapshot(), blocked: gate.reason };

    this.state.islandId = islandId;
    this.state.sceneId = world.start || Object.keys(world.scenes)[0];
    this.state.atChart = false;
    this.state.ending = null;
    this.state.echo = null;
    this.state.folded = false;
    this.state.pendingCost = null;
    if (!this.state.visited.includes(islandId)) {
      this.state.visited.push(islandId);
    }
    this.enterScene(this.state.sceneId);
    return this.snapshot();
  }

  enterScene(sceneId) {
    const world = this.world;
    const scene = world?.scenes?.[sceneId];
    if (!scene) throw new Error(`未知的场景：${world?.id}/${sceneId}`);

    this.state.sceneId = sceneId;
    this.state.echo = null;
    this.state.folded = false;
    this.state.pendingCost = null;

    if (scene.fragment) this.grantFragment(scene.fragment);
    if (scene.note) this.addNote(scene.note);
    if (scene.learnRule) this.learnRule(world.id);
    if (scene.returnLost) this.returnLost();

    const enter = scene.enter;
    if (enter) {
      for (const flag of enter.flags || []) this.addFlag(flag);
      for (const flag of enter.clearFlags || []) this.removeFlag(flag);
      if (enter.note) this.addNote(enter.note);
    }

    if (scene.ending) this.setEnding(scene.ending);
  }

  grantFragment(fragment) {
    if (!fragment?.id) return false;
    if (this.hasFragment(fragment.id)) return false;
    if (this.state.lost.some((f) => f.id === fragment.id)) return false;
    const known = this.fragmentById(fragment.id);
    this.state.fragments.push({
      ...(known || {}),
      ...fragment,
      returned: false,
    });
    return true;
  }

  addNote(note) {
    if (!note?.id) return false;
    if (this.state.notes.some((n) => n.id === note.id)) return false;
    this.state.notes.push({ id: note.id, text: note.text });
    return true;
  }

  learnRule(islandId) {
    if (!islandId || this.state.rules.includes(islandId)) return false;
    this.state.rules.push(islandId);
    return true;
  }

  addFlag(flag) {
    if (!flag || this.state.flags.includes(flag)) return false;
    this.state.flags.push(flag);
    return true;
  }

  removeFlag(flag) {
    const index = this.state.flags.indexOf(flag);
    if (index === -1) return false;
    this.state.flags.splice(index, 1);
    return true;
  }

  returnLost() {
    if (this.state.lost.length === 0) return [];
    const returned = this.state.lost.map((f) => ({ ...f, returned: true }));
    for (const fragment of returned) {
      if (!this.hasFragment(fragment.id)) this.state.fragments.push(fragment);
    }
    this.state.lost = [];
    return returned;
  }

  loseFragment(id) {
    const index = this.state.fragments.findIndex((f) => f.id === id);
    if (index === -1) return null;
    const [fragment] = this.state.fragments.splice(index, 1);
    this.state.lost.push({ ...fragment, returned: false });
    return fragment;
  }

  /* ------------------------------------------------------------------ */
  /* 选择                                                                */
  /* ------------------------------------------------------------------ */

  currentChoices() {
    const scene = this.scene;
    if (!scene) return [];
    const list = this.state.folded && scene.fold?.choices
      ? scene.fold.choices
      : scene.choices || [];
    // onlyIf：条件不成立时整条选项不出现（区别于 requires：出现但锁定）
    return list.filter((choice) => !choice.onlyIf || this.checkRequires(choice.onlyIf).ok);
  }

  describeChoices() {
    return this.currentChoices().map((choice, index) => {
      const gate = this.checkRequires(choice.requires);
      let ok = gate.ok;
      let reason = gate.reason || "";
      if (ok && choice.cost > 0 && this.state.fragments.length < choice.cost) {
        ok = false;
        reason = "你身上的记忆还不够。";
      }
      if (ok && choice.takeFragment && !this.hasFragment(choice.takeFragment)) {
        ok = false;
        reason = "你还没有想起那件事。";
      }
      return {
        index,
        label: choice.label,
        hint: choice.hint || "",
        enabled: ok,
        reason,
        cost: choice.cost || 0,
        ending: choice.ending || null,
      };
    });
  }

  choose(index, options = {}) {
    const scene = this.scene;
    if (!scene || this.state.ending) return this.snapshot();

    const choices = this.currentChoices();
    const choice = choices[index];
    if (!choice) return this.snapshot();

    const gate = this.checkRequires(choice.requires);
    if (!gate.ok) return this.snapshot();

    // 代价选项在碎片不足时不应该打开选择器（UI 会锁定，但引擎也要守住）
    if (choice.cost > 0 && !options.fragmentId && this.state.fragments.length < choice.cost) {
      return this.snapshot();
    }

    if (scene.echo && !options.fragmentId) {
      if (this.state.echo !== index) {
        this.state.echo = index;
        return this.snapshot();
      }
      this.state.echo = null;
    }

    if (choice.cost > 0) {
      if (!options.fragmentId) {
        this.state.pendingCost = { index, count: choice.cost };
        return this.snapshot();
      }
      if (!this.hasFragment(options.fragmentId)) {
        this.state.pendingCost = { index, count: choice.cost };
        return this.snapshot();
      }
      this.loseFragment(options.fragmentId);
    }

    if (choice.takeFragment) {
      if (!this.hasFragment(choice.takeFragment)) return this.snapshot();
      this.loseFragment(choice.takeFragment);
    }

    this.state.pendingCost = null;
    this.state.steps += 1;

    const effects = choice.effects || {};
    for (const flag of effects.flags || []) this.addFlag(flag);
    for (const flag of effects.clearFlags || []) this.removeFlag(flag);
    if (choice.note) this.addNote(choice.note);
    if (effects.note) this.addNote(effects.note);
    if (effects.learnRule) this.learnRule(this.world?.id);

    if (choice.ending) {
      this.setEnding(choice.ending);
      return this.snapshot();
    }

    if (choice.to === CHART) {
      this.toChart();
      return this.snapshot();
    }

    if (choice.to) {
      this.enterScene(choice.to);
    }
    return this.snapshot();
  }

  fold() {
    const scene = this.scene;
    if (!scene?.fold) return this.snapshot();
    this.state.folded = true;
    this.state.echo = null;
    this.state.pendingCost = null;
    return this.snapshot();
  }

  clearPendingCost() {
    this.state.pendingCost = null;
    return this.snapshot();
  }

  toChart() {
    this.state.atChart = true;
    this.state.islandId = null;
    this.state.sceneId = null;
    this.state.echo = null;
    this.state.folded = false;
    this.state.pendingCost = null;
    return this.snapshot();
  }

  setEnding(id) {
    if (!this.endings.some((e) => e.id === id)) {
      throw new Error(`未知的结局：${id}`);
    }
    this.state.ending = id;
    this.state.atChart = false;
    this.state.pendingCost = null;
  }

  /* ------------------------------------------------------------------ */
  /* 海图                                                                */
  /* ------------------------------------------------------------------ */

  chartModel() {
    return this.chartedWorlds.map((world) => {
      const gate = this.checkRequires(world.requires);
      const fragment = this.worldFragment(world);
      const visited = this.state.visited.includes(world.id);
      const collected = Boolean(fragment && this.hasFragment(fragment.id));
      return {
        id: world.id,
        name: world.name,
        en: world.en || "",
        whisper: world.whisper || "",
        mood: world.mood || "prologue",
        x: world.chartPos?.[0] ?? 50,
        y: world.chartPos?.[1] ?? 50,
        center: Boolean(world.center),
        locked: !gate.ok,
        lockReason: gate.reason || "",
        visited,
        collected,
        current: this.state.islandId === world.id,
        fragmentId: fragment?.id || null,
        glyph: fragment?.glyph || "",
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* 快照与存档                                                          */
  /* ------------------------------------------------------------------ */

  snapshot() {
    const world = this.world;
    const scene = this.scene;
    const ending = this.ending;
    const folded = this.state.folded && Boolean(scene?.fold);
    return {
      screen: this.screen,
      island: world
        ? {
            id: world.id,
            name: world.name,
            en: world.en || "",
            mood: world.mood || "prologue",
            rule: world.rule || "",
            ruleKnown: this.state.rules.includes(world.id),
            center: Boolean(world.center),
          }
        : null,
      scene: scene
        ? {
            id: this.state.sceneId,
            text: scene.text || [],
            echo: Boolean(scene.echo),
            echoPending: this.state.echo,
            fold: scene.fold
              ? {
                  label: scene.fold.label || "折起来",
                  used: folded,
                  text: folded ? scene.fold.text || scene.text || [] : [],
                }
              : null,
            ending: scene.ending || null,
          }
        : null,
      choices: this.screen === "game" ? this.describeChoices() : [],
      pendingCost: this.state.pendingCost,
      fragments: [...this.state.fragments],
      lostFragments: [...this.state.lost],
      notes: [...this.state.notes],
      rules: this.state.rules
        .map((id) => this.worldById.get(id))
        .filter(Boolean)
        .map((w) => ({ id: w.id, name: w.name, rule: w.rule })),
      flags: [...this.state.flags],
      visited: [...this.state.visited],
      chart: this.chartModel(),
      ending,
      stats: {
        fragments: this.state.fragments.length,
        totalFragments: this.totalFragments,
        notes: this.state.notes.length,
        totalNotes: this.totalNotes,
        islands: this.chartedVisited,
        totalIslands: this.chartedWorlds.filter((world) => !world.center).length,
        steps: this.state.steps,
      },
    };
  }

  serialize() {
    return {
      v: SAVE_VERSION,
      state: {
        islandId: this.state.islandId,
        sceneId: this.state.sceneId,
        fragments: this.state.fragments,
        lost: this.state.lost,
        notes: this.state.notes,
        flags: this.state.flags,
        rules: this.state.rules,
        visited: this.state.visited,
        ending: this.state.ending,
        steps: this.state.steps,
        atChart: this.state.atChart,
      },
    };
  }

  restore(payload) {
    if (!payload) return this.snapshot();

    // v1 存档：{ worldId, sceneId, fragments, ruleUnlocked, finished }
    if (payload.v == null && (payload.worldId || payload.sceneId)) {
      this.restoreLegacy(payload);
      return this.snapshot();
    }

    const state = payload.state || payload;
    const islandId = state.islandId ?? null;
    const sceneId = state.sceneId ?? null;
    if (islandId && !this.worldById.has(islandId)) {
      this.state.atChart = true;
      return this.snapshot();
    }
    if (islandId && this.worldById.get(islandId)?.scenes?.[sceneId] == null) {
      this.state.islandId = islandId;
      this.state.atChart = true;
      return this.snapshot();
    }

    this.state = {
      islandId,
      sceneId,
      fragments: Array.isArray(state.fragments) ? state.fragments : [],
      lost: Array.isArray(state.lost) ? state.lost : [],
      notes: Array.isArray(state.notes) ? state.notes : [],
      flags: Array.isArray(state.flags) ? state.flags : [],
      rules: Array.isArray(state.rules) ? state.rules : [],
      visited: Array.isArray(state.visited) ? state.visited : [],
      echo: null,
      folded: false,
      ending: state.ending && this.endings.some((e) => e.id === state.ending) ? state.ending : null,
      pendingCost: null,
      steps: Number.isFinite(state.steps) ? state.steps : 0,
      atChart: Boolean(state.atChart),
    };
    return this.snapshot();
  }

  restoreLegacy(payload) {
    const alias = { "jingmo-yu": "jingmo" };
    const islandId = alias[payload.worldId] || payload.worldId || null;
    const world = this.worldById.get(islandId);
    const sceneId = world?.scenes?.[payload.sceneId] ? payload.sceneId : world?.start || null;
    const fragments = (Array.isArray(payload.fragments) ? payload.fragments : []).map((fragment) => {
      const known = this.fragmentById(fragment.id);
      return { ...(known || {}), ...fragment, returned: false };
    });

    this.state = {
      islandId,
      sceneId,
      fragments,
      lost: [],
      notes: [],
      flags: [],
      rules: payload.ruleUnlocked && islandId ? [islandId] : [],
      visited: islandId ? [islandId] : [],
      echo: null,
      folded: false,
      ending: null,
      pendingCost: null,
      steps: 0,
      atChart: Boolean(payload.finished) || !sceneId,
    };
    return this.snapshot();
  }
}
