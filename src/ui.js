export function show(el) {
  el.classList.remove("hidden");
}

export function hide(el) {
  el.classList.add("hidden");
}

export function renderScene(snapshot, refs) {
  const { sceneText, choicesBox, worldName, ruleBadge, fragmentCount, endNote } = refs;

  worldName.textContent = snapshot.worldName;
  fragmentCount.textContent = String(snapshot.fragments.length);
  ruleBadge.classList.toggle("hidden", !snapshot.ruleUnlocked);

  const para = document.createElement("p");
  para.className = "scene-para fade-in";
  para.textContent = snapshot.text;
  sceneText.replaceChildren(para);

  choicesBox.replaceChildren();
  snapshot.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "btn choice";
    btn.textContent = choice.label;
    btn.addEventListener("click", () => refs.onChoice(index));
    choicesBox.appendChild(btn);
  });

  endNote.classList.toggle("hidden", !snapshot.finished);
}

export function renderRule(ruleText, ruleEl) {
  ruleEl.textContent = ruleText;
}

export function renderFragments(fragments, listEl) {
  listEl.replaceChildren();
  if (fragments.length === 0) {
    const li = document.createElement("li");
    li.textContent = "还没有记忆碎片。航程尚未开始。";
    listEl.appendChild(li);
    return;
  }
  fragments.forEach((fragment) => {
    const li = document.createElement("li");
    li.textContent = fragment.text;
    listEl.appendChild(li);
  });
}
