const delay = (milliseconds) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const getAssetEntry = (collection, key) => {
  if (!key) {
    return null;
  }

  return collection[key] ?? null;
};

const findStage = (config, progress) =>
  config.progression.states.reduce((activeStage, stage) => {
    if (progress >= stage.progress) {
      return stage;
    }
    return activeStage;
  }, config.progression.states[0]);

const renderCounter = (config, progress) =>
  config.copy.counterTemplate
    .replace("{current}", `${progress}`)
    .replace("{total}", `${config.progression.maxProgress}`);

const restartAnimation = (element, animation) => {
  element.style.animation = "none";
  void element.offsetWidth;
  element.style.animation = animation;
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

const applyStageState = ({ bodyLayer, faceLayer, config, progress }) => {
  const stageState = findStage(config, progress);
  setLayerState(bodyLayer, getAssetEntry(config.assets.character, stageState.body));
  setLayerState(faceLayer, getAssetEntry(config.assets.face, stageState.face));
};

const createCombTool = () => {
  const comb = document.createElement("div");
  comb.className = "scene-panel__comb";

  const handle = document.createElement("span");
  handle.className = "scene-panel__comb-handle";

  const spine = document.createElement("span");
  spine.className = "scene-panel__comb-spine";

  const teeth = document.createElement("span");
  teeth.className = "scene-panel__comb-teeth";

  Array.from({ length: 8 }, () => {
    const tooth = document.createElement("span");
    tooth.className = "scene-panel__comb-tooth";
    teeth.append(tooth);
    return tooth;
  });

  comb.append(handle, spine, teeth);
  return comb;
};

const createNeedleTool = () => {
  const needle = document.createElement("div");
  needle.className = "scene-panel__needle";

  const shaft = document.createElement("span");
  shaft.className = "scene-panel__needle-shaft";

  const eye = document.createElement("span");
  eye.className = "scene-panel__needle-eye";

  const thread = document.createElement("span");
  thread.className = "scene-panel__needle-thread";

  needle.append(shaft, eye, thread);
  return needle;
};

const createSparkleBurst = (config) => {
  const sparkles = document.createElement("div");
  sparkles.className = "scene-panel__sparkles";

  const count = config.effects.cutsceneSparkleCount;
  const angleStep = 360 / count;
  const radiusRange =
    config.effects.cutsceneSparkleRadiusMaxPx - config.effects.cutsceneSparkleRadiusMinPx;
  const sizeRange =
    config.effects.cutsceneSparkleSizeMaxPx - config.effects.cutsceneSparkleSizeMinPx;

  Array.from({ length: count }, (_, index) => {
    const sparkle = document.createElement("span");
    sparkle.className = "scene-panel__sparkle";

    const progress = count === 1 ? 0 : index / (count - 1);
    const radius = config.effects.cutsceneSparkleRadiusMinPx + radiusRange * progress;
    const size =
      config.effects.cutsceneSparkleSizeMinPx +
      sizeRange * (index % 2 === 0 ? progress : 1 - progress * 0.4);

    sparkle.style.setProperty("--sparkle-angle", `${angleStep * index - 90}deg`);
    sparkle.style.setProperty("--sparkle-radius", `${radius}px`);
    sparkle.style.setProperty("--sparkle-size", `${size}px`);
    sparkle.style.setProperty(
      "--sparkle-color",
      config.effects.cutsceneSparkleColors[index % config.effects.cutsceneSparkleColors.length]
    );
    sparkle.style.setProperty("--sparkle-delay", `${index * 45}ms`);
    sparkles.append(sparkle);
    return sparkle;
  });

  return sparkles;
};

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
  bodyLayer.className = "scene-panel__layer scene-panel__layer--body";

  const faceLayer = document.createElement("img");
  faceLayer.className = "scene-panel__layer scene-panel__layer--face";

  characterStack.append(bodyLayer, faceLayer);
  stage.append(characterStack);

  const cutscene = document.createElement("div");
  cutscene.className = "scene-panel__cutscene";

  const cutsceneFlash = document.createElement("div");
  cutsceneFlash.className = "scene-panel__cutscene-flash";

  const wipe = document.createElement("div");
  wipe.className = "scene-panel__wipe";

  const hairFocus = document.createElement("div");
  hairFocus.className = "scene-panel__hair-focus";

  const combTool = createCombTool();
  const needleTool = createNeedleTool();
  const sparkles = createSparkleBurst(config);

  const stitches = document.createElement("div");
  stitches.className = "scene-panel__stitches";

  Array.from({ length: 4 }, (_, index) => {
    const stitch = document.createElement("span");
    stitch.className = "scene-panel__stitch";
    stitch.style.setProperty("--stitch-index", `${index}`);
    stitches.append(stitch);
    return stitch;
  });

  cutscene.append(cutsceneFlash, sparkles, hairFocus, stitches, wipe, combTool, needleTool);
  mount.replaceChildren(backdrop, veil, hud, stage, cutscene);

  return {
    setProgress(progress) {
      const progressRatio = (progress / config.progression.maxProgress) * 100;
      counter.textContent = renderCounter(config, progress);
      progressFill.style.inlineSize = `${progressRatio}%`;
      applyStageState({ bodyLayer, faceLayer, config, progress });
    },
    async playCutscene({ fromProgress, toProgress }) {
      if (!config.cutscene.stages.includes(toProgress)) {
        this.setProgress(toProgress);
        return;
      }

      const durationByStage = {
        1: config.animation.towelCutsceneMs,
        2: config.animation.combCutsceneMs,
        3: config.animation.needleCutsceneMs
      };
      const totalDuration = durationByStage[toProgress] ?? config.animation.sceneFadeMs;
      const stateSwapDelay = totalDuration * config.animation.cutsceneStateSwapRatio;

      applyStageState({ bodyLayer, faceLayer, config, progress: fromProgress });
      stage.classList.add("is-cutscene-active");
      cutscene.className = `scene-panel__cutscene is-visible is-stage-${toProgress}`;

      restartAnimation(cutsceneFlash, `scene-flash ${config.animation.sceneFadeMs}ms ease`);
      wipe.style.animation = "none";
      hairFocus.style.animation = "none";
      combTool.style.animation = "none";
      needleTool.style.animation = "none";
      sparkles.querySelectorAll(".scene-panel__sparkle").forEach((sparkle) => {
        sparkle.style.animation = "none";
      });
      stitches.querySelectorAll(".scene-panel__stitch").forEach((stitch, index) => {
        stitch.style.animation = "none";
        stitch.style.animationDelay = `${index * 140}ms`;
      });

      if (toProgress === 1) {
        restartAnimation(wipe, `towel-wipe ${config.animation.towelCutsceneMs}ms ease forwards`);
      }

      if (toProgress === 2) {
        restartAnimation(hairFocus, `hair-focus ${config.animation.combCutsceneMs}ms ease forwards`);
        restartAnimation(combTool, `comb-sweep ${config.animation.combCutsceneMs}ms ease-in-out forwards`);
      }

      if (toProgress === 3) {
        restartAnimation(needleTool, `needle-sew ${config.animation.needleCutsceneMs}ms ease-in-out forwards`);
        stitches.querySelectorAll(".scene-panel__stitch").forEach((stitch) => {
          restartAnimation(stitch, `stitch-appear ${config.animation.needleCutsceneMs}ms ease forwards`);
        });
      }

      await delay(stateSwapDelay);
      sparkles.querySelectorAll(".scene-panel__sparkle").forEach((sparkle) => {
        restartAnimation(
          sparkle,
          `sparkle-burst ${config.animation.cutsceneSparkleMs}ms ease-out forwards`
        );
      });
      this.setProgress(toProgress);
      await delay(totalDuration - stateSwapDelay);

      stage.classList.remove("is-cutscene-active");
      cutscene.className = "scene-panel__cutscene";
      cutsceneFlash.style.animation = "";
      wipe.style.animation = "";
      hairFocus.style.animation = "";
      combTool.style.animation = "";
      needleTool.style.animation = "";
      sparkles.querySelectorAll(".scene-panel__sparkle").forEach((sparkle) => {
        sparkle.style.animation = "";
      });
      stitches.querySelectorAll(".scene-panel__stitch").forEach((stitch) => {
        stitch.style.animation = "";
      });
    }
  };
};
