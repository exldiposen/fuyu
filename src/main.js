import { createEngine } from "./engine.js";
import { show, hide, renderScene, renderRule, renderFragments } from "./ui.js";

const SAVE_KEY = "fuyu-save-v1";

const refs = {
  titleScreen: document.getElementById("title-screen"),
  gameScreen: document.getElementById("game-screen"),
  fragmentsScreen: document.getElementById("fragments-screen"),
  startBtn: document.getElementById("start-btn"),
  continueHint: document.getElementById("continue-hint"),
  continueBtn: document.getElementById("continue-btn"),
  worldName: document.getElementById("world-name"),
  ruleBadge: document.getElementById("rule-badge"),
  ruleCard: document.getElementById("rule-card"),
  ruleText: document.getElementById("rule-text"),
  sceneText: document.getElementById("scene-text"),
  choicesBox: document.getElementById("choices"),
  endNote: document.getElementById("end-note"),
  restartBtn: document.getElementById("restart-btn"),
  fragmentsBtn: document.getElementById("fragments-btn"),
  fragmentCount: document.getElementById("fragment-count"),
  fragmentList: document.getElementById("fragment-list"),
  backBtn: document.getElementById("back-btn"),
};

let worlds = [];
let engine = null;

function save() {
  if (!engine) return;
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      worldId: engine.world.id,
      sceneId: engine.sceneId,
      fragments: engine.fragments,
      ruleUnlocked: engine.ruleUnlocked,
      finished: engine.finished,
    })
  );
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function screen(name) {
  hide(refs.titleScreen);
  hide(refs.gameScreen);
  hide(refs.fragmentsScreen);
  const map = { title: refs.titleScreen, game: refs.gameScreen, fragments: refs.fragmentsScreen };
  show(map[name]);
}

function render() {
  if (!engine) return;
  const snapshot = engine.snapshot();
  renderScene(snapshot, { ...refs, onChoice: choose });
  const ruleHidden = !snapshot.ruleUnlocked;
  refs.ruleCard.classList.toggle("hidden", ruleHidden);
  if (!ruleHidden) renderRule(snapshot.rule, refs.ruleText);
  save();
}

function choose(index) {
  if (!engine) return;
  engine.choose(index);
  render();
}

function startWorld(saveData) {
  const world = worlds[0];
  if (!world) return;
  engine = createEngine(world);
  if (saveData) engine.restore(saveData);
  else engine.start();
  render();
  screen("game");
}

function restart() {
  clearSave();
  engine = null;
  hide(refs.ruleCard);
  screen("title");
  refs.continueHint.classList.toggle("hidden", true);
}

function showFragments() {
  renderFragments(engine ? engine.fragments : [], refs.fragmentList);
  screen("fragments");
}

function backFromFragments() {
  screen(engine ? "game" : "title");
}

async function boot() {
  const res = await fetch("data/worlds.json");
  const data = await res.json();
  worlds = data.worlds;

  refs.startBtn.addEventListener("click", () => startWorld(null));
  refs.continueBtn.addEventListener("click", () => startWorld(loadSave()));
  refs.restartBtn.addEventListener("click", restart);
  refs.fragmentsBtn.addEventListener("click", showFragments);
  refs.backBtn.addEventListener("click", backFromFragments);
  refs.ruleBadge.addEventListener("click", () => {
    refs.ruleCard.classList.toggle("hidden");
  });

  const saveData = loadSave();
  refs.continueHint.classList.toggle("hidden", !saveData);
  screen("title");
}

boot();
