const getAssetEntry = (collection, key) => {
  if (!key) {
    return null;
  }
  return collection[key] ?? null;
};

const setLayerState = (image, assetEntry) => {
  if (!assetEntry) {
    image.removeAttribute("src");
    image.alt = "";
    image.classList.add("is-hidden");
    return;
  }

  image.src = assetEntry.path;
  image.alt = assetEntry.alt;
  image.classList.remove("is-hidden");
};

const renderCounter = (config, progress) =>
  config.copy.counterTemplate
    .replace("{current}", `${progress}`)
    .replace("{total}", `${config.progression.maxProgress}`);

export const createDramaScene = ({ mount, config }) => {
  const backdrop = document.createElement("div");
  backdrop.className = "scene-panel__backdrop";
  backdrop.style.backgroundImage = `url("${config.assets.background.path}")`;

  const veil = document.createElement("div");
  veil.className = "scene-panel__veil";

  const hud = document.createElement("div");
  hud.className = "scene-panel__hud";

  const progressBar = document.createElement("div");
  progressBar.className = "scene-panel__progress";

  const progressFill = document.createElement("div");
  progressFill.className = "scene-panel__progress-fill";

  const counter = document.createElement("div");
  counter.className = "scene-panel__counter";

  progressBar.append(progressFill);
  hud.append(progressBar, counter);

  const stage = document.createElement("div");
  stage.className = "scene-panel__stage";

  const characterStack = document.createElement("div");
  characterStack.className = "scene-panel__character-stack";

  const bodyLayer = document.createElement("img");
  bodyLayer.className = "scene-panel__layer";

  const hairLayer = document.createElement("img");
  hairLayer.className = "scene-panel__layer";

  const faceLayer = document.createElement("img");
  faceLayer.className = "scene-panel__layer";

  characterStack.append(bodyLayer, hairLayer, faceLayer);
  stage.append(characterStack);

  mount.replaceChildren(backdrop, veil, hud, stage);

  return {
    setProgress(progress) {
      const stageState = config.progression.states.reduce((activeStage, stage) => {
        if (progress >= stage.progress) {
          return stage;
        }
        return activeStage;
      }, config.progression.states[0]);
      const progressRatio = (progress / config.progression.maxProgress) * 100;

      counter.textContent = renderCounter(config, progress);
      progressFill.style.inlineSize = `${progressRatio}%`;

      setLayerState(bodyLayer, getAssetEntry(config.assets.character, stageState.body));
      setLayerState(hairLayer, getAssetEntry(config.assets.hair, stageState.hair));
      setLayerState(faceLayer, getAssetEntry(config.assets.face, stageState.face));
    }
  };
};
