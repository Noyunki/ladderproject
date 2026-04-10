import { createDramaScene } from "./scenes/dramaScene.js";
import { createMergeGame, resolveStage } from "./puzzle/mergeGame.js";

const configPath = new URL("./config.json", import.meta.url);

const setCssVariable = (name, value) => {
  document.documentElement.style.setProperty(name, value);
};

const applyDocumentMeta = (config) => {
  document.documentElement.lang = config.meta.language;
  document.title = config.meta.title;
};

const applyConfigStyles = (config) => {
  const { layout, animation, board, theme } = config;
  const variables = {
    "--frame-max-width": `${layout.frameMaxWidth}px`,
    "--frame-max-height": `${layout.frameMaxHeight}px`,
    "--frame-padding": `${layout.framePadding}px`,
    "--frame-radius": `${layout.frameRadius}px`,
    "--panel-gap": `${layout.panelGap}px`,
    "--scene-size": `${layout.sceneFlex}fr`,
    "--board-size": `${layout.boardFlex}fr`,
    "--scene-padding": `${layout.scenePadding}px`,
    "--hud-width": `${layout.hudWidth}px`,
    "--hud-gap": `${layout.hudGap}px`,
    "--character-max-width": `${layout.characterMaxWidth}px`,
    "--overlay-logo-width": `${layout.overlayLogoWidth}px`,
    "--overlay-success-width": `${layout.overlaySuccessWidth}px`,
    "--board-padding": `${layout.boardPadding}px`,
    "--board-inner-gap": `${layout.boardInnerGap}px`,
    "--board-header-gap": `${layout.boardHeaderGap}px`,
    "--board-surface-padding": `${layout.boardSurfacePadding}px`,
    "--board-surface-radius": `${layout.boardSurfaceRadius}px`,
    "--grid-gap": `${layout.gridGap}px`,
    "--tile-radius": `${layout.tileRadius}px`,
    "--slot-radius": `${layout.slotRadius}px`,
    "--counter-radius": `${layout.counterRadius}px`,
    "--progress-height": `${layout.progressHeight}px`,
    "--guide-width": `${layout.guideWidth}px`,
    "--guide-offset-x": `${layout.guideOffsetX}px`,
    "--guide-offset-y": `${layout.guideOffsetY}px`,
    "--floating-tile-size": `${layout.floatingTileSize}px`,
    "--overlay-padding": `${layout.overlayPadding}px`,
    "--overlay-card-radius": `${layout.overlayCardRadius}px`,
    "--overlay-card-width": `${layout.overlayCardWidth}px`,
    "--overlay-button-min-width": `${layout.overlayButtonMinWidth}px`,
    "--overlay-button-radius": `${layout.overlayButtonRadius}px`,
    "--overlay-button-gap": `${layout.overlayButtonGap}px`,
    "--success-logo-width": `${layout.successLogoWidth}px`,
    "--celebration-particle-size": `${layout.celebrationParticleSize}px`,
    "--scene-fade-ms": `${animation.sceneFadeMs}ms`,
    "--tile-pop-ms": `${animation.tilePopMs}ms`,
    "--tile-move-ms": `${animation.tileMoveMs}ms`,
    "--guide-loop-ms": `${animation.guideLoopMs}ms`,
    "--merge-hint-ms": `${animation.mergeHintMs}ms`,
    "--guided-hint-ms": `${animation.guidedHintMs}ms`,
    "--success-fade-ms": `${animation.successFadeMs}ms`,
    "--floating-lift-px": `${animation.floatingLiftPx}px`,
    "--overlay-fade-ms": `${animation.overlayFadeMs}ms`,
    "--celebration-ms": `${animation.celebrationMs}ms`,
    "--board-columns": `${board.columns}`
  };

  Object.entries(variables).forEach(([name, value]) => setCssVariable(name, value));

  Object.entries(theme.colors).forEach(([name, value]) => {
    const cssName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    setCssVariable(`--color-${cssName}`, value);
  });
};

const createLoadingScreen = (config) => {
  const loading = document.createElement("div");
  loading.className = "loading-screen";
  loading.textContent = config.copy.loading;
  return loading;
};

const createShell = () => {
  const playable = document.createElement("main");
  playable.className = "playable";

  const frame = document.createElement("div");
  frame.className = "playable__frame";

  const sceneMount = document.createElement("section");
  sceneMount.className = "scene-panel";

  const boardMount = document.createElement("section");
  boardMount.className = "board-panel";

  const overlayMount = document.createElement("div");
  overlayMount.className = "game-overlays";

  frame.append(sceneMount, boardMount, overlayMount);
  playable.append(frame);

  return {
    playable,
    sceneMount,
    boardMount,
    overlayMount
  };
};

const loadConfig = async () => {
  const response = await fetch(configPath);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return response.json();
};

const createOverlays = ({ mount, config, onStart, onRestart, onDownload }) => {
  const createCelebration = () => {
    const celebration = document.createElement("div");
    celebration.className = "game-overlay__celebration";

    Array.from({ length: config.effects.successParticleCount }, (_, index) => {
      const particle = document.createElement("span");
      particle.className = "game-overlay__particle";
      particle.style.setProperty("--particle-index", `${index}`);
      particle.style.setProperty(
        "--particle-color",
        config.effects.successParticleColors[index % config.effects.successParticleColors.length]
      );
      celebration.append(particle);
      return particle;
    });

    return celebration;
  };

  const root = document.createElement("div");
  root.className = "game-overlays__root";

  const startOverlay = document.createElement("section");
  startOverlay.className = "game-overlay is-visible";

  const startCard = document.createElement("div");
  startCard.className = "game-overlay__card";

  const startLogo = document.createElement("img");
  startLogo.className = "game-overlay__logo";
  startLogo.src = config.assets.ui.logoStart.path;
  startLogo.alt = config.assets.ui.logoStart.alt;

  const startButton = document.createElement("button");
  startButton.className = "game-overlay__button game-overlay__button--primary";
  startButton.type = "button";
  startButton.textContent = config.copy.startButtonLabel;

  startButton.addEventListener("click", () => {
    startOverlay.classList.remove("is-visible");
    onStart();
  });

  startCard.append(startLogo, startButton);
  startOverlay.append(startCard);

  const successOverlay = document.createElement("section");
  successOverlay.className = "game-overlay";

  const successCard = document.createElement("div");
  successCard.className = "game-overlay__card";

  let successCelebration = createCelebration();

  const successLogo = document.createElement("img");
  successLogo.className = "game-overlay__success-art";
  successLogo.src = config.assets.ui.logoSuccess.path;
  successLogo.alt = config.assets.ui.logoSuccess.alt;

  const buttonRow = document.createElement("div");
  buttonRow.className = "game-overlay__actions";

  const downloadButton = document.createElement("button");
  downloadButton.className = "game-overlay__button game-overlay__button--primary";
  downloadButton.type = "button";
  downloadButton.textContent = config.copy.downloadButtonLabel;
  downloadButton.disabled = !config.links.downloadUrl;

  const restartButton = document.createElement("button");
  restartButton.className = "game-overlay__button game-overlay__button--secondary";
  restartButton.type = "button";
  restartButton.textContent = config.copy.restartButtonLabel;

  downloadButton.addEventListener("click", onDownload);
  restartButton.addEventListener("click", () => {
    successOverlay.classList.remove("is-visible");
    onRestart();
  });

  buttonRow.append(downloadButton, restartButton);
  successCard.append(
    successCelebration,
    successLogo,
    buttonRow
  );
  successOverlay.append(successCard);

  root.append(startOverlay, successOverlay);
  mount.replaceChildren(root);

  return {
    showSuccess() {
      successCelebration.remove();
      successCelebration = createCelebration();
      successCard.prepend(successCelebration);
      successOverlay.classList.add("is-visible");
    }
  };
};

const bootstrap = async () => {
  const app = document.querySelector("#app");
  const config = await loadConfig();

  applyDocumentMeta(config);
  applyConfigStyles(config);
  app.replaceChildren(createLoadingScreen(config));

  const shell = createShell();
  app.replaceChildren(shell.playable);

  const dramaScene = createDramaScene({
    mount: shell.sceneMount,
    config
  });

  let overlays;

  const mergeGame = createMergeGame({
    mount: shell.boardMount,
    config,
    resolveStage,
    onStateChange: ({ progress, completed }) => {
      dramaScene.setProgress(progress, completed);
      if (completed) {
        overlays.showSuccess();
      }
    }
  });

  const handleDownload = () => {
    if (!config.links.downloadUrl) {
      return;
    }

    window.open(config.links.downloadUrl, config.links.downloadTarget);
  };

  overlays = createOverlays({
    mount: shell.overlayMount,
    config,
    onStart: () => {
      mergeGame.setInteractionEnabled(true);
    },
    onRestart: () => {
      mergeGame.reset();
      dramaScene.setProgress(config.progression.initialProgress, false);
      mergeGame.setInteractionEnabled(true);
    },
    onDownload: handleDownload
  });

  dramaScene.setProgress(config.progression.initialProgress, false);
  mergeGame.reset();
  mergeGame.setInteractionEnabled(false);
};

bootstrap().catch((error) => {
  console.error(error);
});
