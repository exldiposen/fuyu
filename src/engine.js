export function createEngine(world) {
  return {
    world,
    sceneId: null,
    fragments: [],
    ruleUnlocked: false,
    finished: false,

    start() {
      this.sceneId = world.start || Object.keys(world.scenes)[0];
      this.applySceneEffects();
      return this.snapshot();
    },

    choose(index) {
      if (this.finished) return this.snapshot();
      const scene = world.scenes[this.sceneId];
      const choice = scene && scene.choices && scene.choices[index];
      if (!choice) return this.snapshot();
      this.sceneId = choice.to;
      this.applySceneEffects();
      return this.snapshot();
    },

    applySceneEffects() {
      const scene = world.scenes[this.sceneId];
      if (!scene) return;
      if (scene.fragment && !this.fragments.some((f) => f.id === scene.fragment.id)) {
        this.fragments.push(scene.fragment);
        this.ruleUnlocked = true;
      }
      this.finished = !scene.choices || scene.choices.length === 0;
    },

    restore(save) {
      this.sceneId = save.sceneId || world.start;
      this.fragments = Array.isArray(save.fragments) ? save.fragments : [];
      this.ruleUnlocked = Boolean(save.ruleUnlocked);
      this.finished = Boolean(save.finished);
    },

    snapshot() {
      const scene = world.scenes[this.sceneId] || {};
      return {
        worldName: world.name,
        rule: world.rule,
        sceneId: this.sceneId,
        text: scene.text || "",
        choices: scene.choices || [],
        fragments: [...this.fragments],
        ruleUnlocked: this.ruleUnlocked,
        finished: this.finished,
      };
    },
  };
}
