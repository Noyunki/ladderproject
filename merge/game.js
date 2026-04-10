(function () {
  const config = window.GAME_DATA;
  const meta = config.meta;
  const assets = config.assets || {};
  const integration = config.integration || {};
  const timeline = config.timelineMs;
  const shell = document.querySelector(".game-shell");
  const itemsRoot = document.getElementById("items");
  const brandSlot = document.getElementById("brandSlot");
  const stateBadge = document.getElementById("stateBadge");
  const objectiveText = document.getElementById("objectiveText");
  const attemptsText = document.getElementById("attemptsText");
  const headline = document.getElementById("headline");
  const subline = document.getElementById("subline");
  const warningText = document.getElementById("warningText");
  const resultBadge = document.getElementById("resultBadge");
  const characterImage = document.getElementById("characterImage");
  const characterCaption = document.getElementById("characterCaption");
  const feedbackText = document.getElementById("feedbackText");
  const slotA = document.getElementById("slotA");
  const slotB = document.getElementById("slotB");
  const timerFill = document.getElementById("timerFill");
  const retryButton = document.getElementById("retryButton");
  const ctaButton = document.getElementById("ctaButton");

  const PHASES = {
    BOOT: "boot",
    PREINTRO: "preintro",
    INTRO: "intro",
    PLAY: "play",
    MERGE: "merge",
    SUCCESS: "success",
    FAIL: "fail",
    CTA: "cta",
  };

  const state = {
    phase: PHASES.BOOT,
    selected: [],
    attempts: 0,
    maxAttempts: 2,
    ctaVisible: false,
    timelineStart: 0,
    rafId: 0,
    timers: [],
    layout: "",
  };

  const itemsById = new Map(config.items.map((item) => [item.id, item]));
  const hooks = window[integration.hooksGlobalName || "GAME_HOOKS"];

  document.title = meta.title;
  objectiveText.textContent = meta.objective;
  retryButton.textContent = meta.retryLabel;
  ctaButton.textContent = meta.ctaLabel;

  function emit(eventName, detail) {
    if (integration.emitDomEvents !== false) {
      window.dispatchEvent(
        new CustomEvent(`fake-merge:${eventName}`, {
          detail,
        })
      );
    }

    if (hooks && typeof hooks[eventName] === "function") {
      hooks[eventName](detail);
    }
  }

  function applyAssets() {
    if (meta.brandLabel) {
      brandSlot.hidden = false;
      brandSlot.textContent = meta.brandLabel;
    }

    if (assets.brandImage) {
      brandSlot.hidden = false;
      brandSlot.innerHTML = `<img src="${assets.brandImage}" alt="${meta.title}" />`;
    }

    if (assets.backgroundImage) {
      shell.style.setProperty("--bg-image", `url("${assets.backgroundImage}")`);
      shell.dataset.hasBackground = "true";
    } else {
      shell.style.removeProperty("--bg-image");
      shell.dataset.hasBackground = "false";
    }
  }

  function syncLayoutMode() {
    const ratio = window.innerHeight / Math.max(window.innerWidth, 1);
    const portraitRatio =
      (config.layout && config.layout.portraitBreakpointRatio) || 1.15;
    const nextLayout = ratio >= portraitRatio ? "portrait" : "landscape";

    if (nextLayout !== state.layout || shell.dataset.layout !== nextLayout) {
      state.layout = nextLayout;
      shell.dataset.layout = nextLayout;
      emit("layoutChange", { layout: nextLayout, ratio });
    }
  }

  function getCharacterAsset(phase) {
    const characterAssets = assets.character || {};

    if (phase === PHASES.SUCCESS) {
      return characterAssets.success || characterAssets.idle || "";
    }

    if (phase === PHASES.FAIL) {
      return characterAssets.fail || characterAssets.idle || "";
    }

    return characterAssets.idle || "";
  }

  function syncCharacterAsset(phase) {
    const assetUrl = getCharacterAsset(phase);

    if (!assetUrl) {
      characterImage.hidden = true;
      characterImage.removeAttribute("src");
      characterImage.alt = "";
      shell.dataset.characterAsset = "false";
      return;
    }

    characterImage.hidden = false;
    characterImage.src = assetUrl;
    characterImage.alt = meta.title;
    shell.dataset.characterAsset = "true";
  }

  function queue(callback, delay) {
    const id = window.setTimeout(() => {
      state.timers = state.timers.filter((timerId) => timerId !== id);
      callback();
    }, delay);
    state.timers.push(id);
    return id;
  }

  function clearQueuedTimers() {
    state.timers.forEach((id) => window.clearTimeout(id));
    state.timers = [];
  }

  function isCorrectPair(first, second) {
    const [a, b] = config.correctPair;
    return (first === a && second === b) || (first === b && second === a);
  }

  function updateAttempts() {
    const remaining = Math.max(state.maxAttempts - state.attempts, 0);
    attemptsText.textContent = `${remaining} / ${state.maxAttempts} CHANCES`;
  }

  function updateResultBadge(phase) {
    if (phase === PHASES.SUCCESS) {
      resultBadge.hidden = false;
      resultBadge.textContent = meta.resultLabels.success;
      resultBadge.dataset.tone = "success";
      return;
    }

    if (phase === PHASES.FAIL) {
      resultBadge.hidden = false;
      resultBadge.textContent = meta.resultLabels.fail;
      resultBadge.dataset.tone = "fail";
      return;
    }

    resultBadge.hidden = true;
    resultBadge.dataset.tone = "";
  }

  function updateSelectedSlots() {
    const [first, second] = state.selected;
    slotA.textContent = first ? itemsById.get(first).emoji : "?";
    slotB.textContent = second ? itemsById.get(second).emoji : "?";
    slotA.classList.toggle("is-filled", Boolean(first));
    slotB.classList.toggle("is-filled", Boolean(second));
  }

  function setPhase(phase) {
    const previousPhase = state.phase;
    state.phase = phase;
    shell.dataset.state = phase;

    const text = config.phaseText[phase];
    if (text) {
      stateBadge.textContent = text.badge;
      headline.textContent = text.headline;
      subline.textContent = text.subline;
      warningText.textContent = text.warning;
      characterCaption.textContent = text.caption;
      feedbackText.textContent = text.feedback;
    }
    updateResultBadge(phase);
    updateAttempts();
    syncCharacterAsset(phase);

    const playEnabled = phase === PHASES.PLAY;
    itemsRoot.querySelectorAll(".item-card").forEach((button) => {
      const alreadySelected = state.selected.includes(button.dataset.itemId);
      button.disabled = !playEnabled || alreadySelected;
      button.classList.toggle("is-disabled", !playEnabled);
    });

    retryButton.hidden = !(phase === PHASES.FAIL || phase === PHASES.CTA);
    emit("phaseChange", {
      phase,
      previousPhase,
      attempts: state.attempts,
      selected: [...state.selected],
      ctaVisible: state.ctaVisible,
    });
  }

  function renderItems() {
    itemsRoot.innerHTML = "";

    config.items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "item-card";
      button.dataset.itemId = item.id;
      button.style.setProperty("--item-accent", item.accent);
      button.style.setProperty("--item-soft", item.accentSoft);
      button.innerHTML = `
        <span class="item-card__emoji" aria-hidden="true">${item.emoji}</span>
        <span class="item-card__label">${item.label}</span>
        <span class="item-card__desc">${item.description}</span>
      `;
      button.addEventListener("click", () => onSelect(item.id));
      itemsRoot.appendChild(button);
    });
  }

  function syncSelections() {
    itemsRoot.querySelectorAll(".item-card").forEach((button) => {
      const selected = state.selected.includes(button.dataset.itemId);
      button.classList.toggle("is-selected", selected);
      if (state.phase === PHASES.PLAY) {
        button.disabled = selected;
      }
    });
  }

  function revealCTA() {
    if (state.ctaVisible) {
      return;
    }

    state.ctaVisible = true;
    shell.classList.add("is-cta-visible");
    ctaButton.hidden = false;
    emit("ctaReveal", {
      attempts: state.attempts,
      selected: [...state.selected],
    });
  }

  function enterCTA() {
    revealCTA();
    setPhase(PHASES.CTA);
  }

  function resolveMerge() {
    const [first, second] = state.selected;
    const success = isCorrectPair(first, second);
    setPhase(success ? PHASES.SUCCESS : PHASES.FAIL);
    emit("mergeResolved", {
      first,
      second,
      success,
      attempts: state.attempts,
    });

    if (success) {
      queue(enterCTA, timeline.result);
      return;
    }

    if (state.attempts < state.maxAttempts) {
      queue(() => {
        state.selected = [];
        updateSelectedSlots();
        syncSelections();
        setPhase(PHASES.PLAY);
        feedbackText.textContent =
          "오답 머지입니다. 폭풍이 끝나기 전에 한 번 더 시도해 보세요.";
      }, 1100);
    } else {
      queue(enterCTA, timeline.result);
    }
  }

  function runMerge() {
    setPhase(PHASES.MERGE);
    syncSelections();
    queue(resolveMerge, timeline.merge);
  }

  function onSelect(itemId) {
    if (state.phase !== PHASES.PLAY) {
      return;
    }

    if (state.selected.includes(itemId)) {
      return;
    }

    state.selected.push(itemId);
    updateSelectedSlots();
    syncSelections();
    emit("itemSelect", {
      itemId,
      selected: [...state.selected],
      attempts: state.attempts,
    });

    if (state.selected.length === 2) {
      state.attempts += 1;
      updateAttempts();
      runMerge();
    }
  }

  function tick(now) {
    if (!state.timelineStart) {
      state.timelineStart = now;
    }

    const elapsed = now - state.timelineStart;
    const progress = Math.min(elapsed / timeline.total, 1);
    timerFill.style.width = `${progress * 100}%`;

    if (elapsed >= timeline.ctaReveal) {
      revealCTA();
    }

    state.rafId = window.requestAnimationFrame(tick);
  }

  function startTimeline() {
    state.timelineStart = 0;
    if (state.rafId) {
      window.cancelAnimationFrame(state.rafId);
    }
    state.rafId = window.requestAnimationFrame(tick);
  }

  function startGame() {
    clearQueuedTimers();
    state.selected = [];
    state.attempts = 0;
    state.ctaVisible = false;
    shell.classList.remove("is-cta-visible");
    ctaButton.hidden = true;
    resultBadge.hidden = true;
    updateSelectedSlots();
    syncSelections();
    updateAttempts();
    syncLayoutMode();

    setPhase(PHASES.PREINTRO);
    queue(() => setPhase(PHASES.INTRO), timeline.preintro);
    queue(() => setPhase(PHASES.PLAY), timeline.preintro + timeline.intro);
    startTimeline();
    emit("gameStart", {
      totalMs: timeline.total,
      maxAttempts: state.maxAttempts,
    });
  }

  retryButton.addEventListener("click", () => {
    emit("retryClick", {
      attempts: state.attempts,
      phase: state.phase,
    });
    startGame();
  });
  ctaButton.addEventListener("click", () => {
    emit("ctaClick", {
      attempts: state.attempts,
      phase: state.phase,
      url: meta.ctaUrl,
    });

    if (meta.ctaUrl && meta.ctaUrl !== "#") {
      window.location.href = meta.ctaUrl;
      return;
    }

    feedbackText.textContent =
      "CTA가 눌렸습니다. 실제 광고 슬롯이라면 여기서 스토어 페이지로 이동합니다.";
    ctaButton.classList.add("is-confirmed");
    queue(() => ctaButton.classList.remove("is-confirmed"), 1200);
  });

  window.addEventListener("resize", syncLayoutMode);
  applyAssets();
  renderItems();
  startGame();
})();
