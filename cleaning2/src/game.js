(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const logoImage = document.getElementById("logoImage");
  const logoFallback = document.getElementById("logoFallback");
  const startLogoImage = document.getElementById("startLogoImage");
  const startLogoFallback = document.getElementById("startLogoFallback");
  const stageChip = document.getElementById("stageChip");
  const objectiveText = document.getElementById("objectiveText");
  const progressLabel = document.getElementById("progressLabel");
  const progressValue = document.getElementById("progressValue");
  const progressFill = document.getElementById("progressFill");
  const toolDock = document.getElementById("toolDock");
  const toolButton = document.getElementById("toolButton");
  const toolIcon = document.getElementById("toolIcon");
  const toolFallback = document.getElementById("toolFallback");
  const startScreen = document.getElementById("startScreen");
  const startButton = document.getElementById("startButton");

  const WIDTH = 720;
  const HEIGHT = 1280;
  const character = { x: 120, y: 205, w: 480, h: 860 };
  const hairEllipse = { x: 360, y: 380, rx: 150, ry: 140 };
  const face = { x: 360, y: 405, rx: 92, ry: 112 };

  const STAGES = {
    0: {
      chip: "READY",
      objective: "플레이를 시작하면 오늘의 메이크오버가 시작됩니다.",
      progressLabel: "PREP",
      tool: null,
      fallbackLogo: "GROOMING & CLEAN-UP",
    },
    1: {
      chip: "STEP 1 / 3",
      objective: "타월로 캐릭터 위를 문질러 진흙을 깨끗하게 닦아내세요.",
      progressLabel: "CLEANING",
      tool: "towel",
      fallbackLogo: "GROOMING & CLEAN-UP",
    },
    2: {
      chip: "STEP 2 / 3",
      objective: "찢어진 옷의 가이드를 따라 드래그해서 수선을 완료하세요.",
      progressLabel: "REPAIR",
      tool: "needle",
      fallbackLogo: "GROOMING & CLEAN-UP",
    },
    3: {
      chip: "STEP 3 / 3",
      objective: "빗으로 헝클어진 머리 영역을 정리해서 스타일을 마무리하세요.",
      progressLabel: "HAIR",
      tool: "comb",
      fallbackLogo: "GROOMING & CLEAN-UP",
    },
    4: {
      chip: "COMPLETE",
      objective: "메이크오버 성공. 완성된 스타일을 확인하세요.",
      progressLabel: "SUCCESS",
      tool: null,
      fallbackLogo: "MAKEOVER SUCCESS",
    },
  };

  const TOOL_META = {
    towel: { fallback: "TOWEL", color: "#f7b55c" },
    needle: { fallback: "NEEDLE", color: "#8fe2ff" },
    comb: { fallback: "COMB", color: "#ff8d76" },
  };

  const assets = {
    background: null,
    logoGame: null,
    logoSuccess: null,
    dirty: null,
    cleanWrapped: null,
    clean: null,
    hairMessy: null,
    hairClean: null,
    finger: null,
    success: null,
    towel: null,
    needle: null,
    comb: null,
  };

  const game = {
    stage: 0,
    progress: 0,
    pointer: { active: false, x: WIDTH / 2, y: HEIGHT / 2, id: null },
    tutorialDismissed: false,
    transitionUntil: 0,
    successStartedAt: 0,
    cleanedMud: new Set(),
    stitched: new Set(),
    combedHair: new Set(),
    mudSpots: [],
    repairPoints: [],
    repairLines: [],
    hairCells: [],
    lastProgressFrame: -1,
  };

  function seededRandom(seed) {
    let value = seed % 2147483647;
    if (value <= 0) {
      value += 2147483646;
    }
    return function () {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function isInEllipse(pointX, pointY, ellipse) {
    const dx = (pointX - ellipse.x) / ellipse.rx;
    const dy = (pointY - ellipse.y) / ellipse.ry;
    return dx * dx + dy * dy <= 1;
  }

  function isInsideCharacter(x, y) {
    const headEllipse = { x: 360, y: 405, rx: 164, ry: 190 };
    const bodyRect = { x: 210, y: 540, w: 300, h: 420 };
    return isInEllipse(x, y, headEllipse) || (x >= bodyRect.x && x <= bodyRect.x + bodyRect.w && y >= bodyRect.y && y <= bodyRect.y + bodyRect.h);
  }

  function buildMudSpots() {
    const random = seededRandom(20260323);
    const spots = [];
    let attempts = 0;
    while (spots.length < 90 && attempts < 4000) {
      attempts += 1;
      const x = character.x + random() * character.w;
      const y = character.y + random() * character.h * 0.9;
      if (!isInsideCharacter(x, y)) {
        continue;
      }
      if (isInEllipse(x, y, hairEllipse)) {
        continue;
      }
      spots.push({
        x,
        y,
        radius: 22 + random() * 24,
        rot: random() * Math.PI,
        scaleY: 0.55 + random() * 0.55,
      });
    }
    game.mudSpots = spots;
  }

  function sampleLine(points, spacing) {
    const samples = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const segmentLength = distance(a.x, a.y, b.x, b.y);
      const steps = Math.max(2, Math.round(segmentLength / spacing));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        samples.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        });
      }
    }
    return samples;
  }

  function buildRepairGuide() {
    const lines = [
      [
        { x: 262, y: 675 },
        { x: 305, y: 705 },
        { x: 262, y: 742 },
        { x: 310, y: 780 },
      ],
      [
        { x: 450, y: 705 },
        { x: 392, y: 742 },
        { x: 450, y: 790 },
      ],
      [
        { x: 320, y: 855 },
        { x: 360, y: 830 },
        { x: 410, y: 860 },
      ],
    ];
    game.repairLines = lines;
    game.repairPoints = lines.flatMap((line) => sampleLine(line, 20));
  }

  function buildHairCells() {
    const random = seededRandom(31173);
    const cells = [];
    let attempts = 0;
    while (cells.length < 100 && attempts < 4000) {
      attempts += 1;
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      const x = hairEllipse.x + Math.cos(angle) * hairEllipse.rx * radius;
      const y = hairEllipse.y + Math.sin(angle) * hairEllipse.ry * radius;
      if (y > 520) {
        continue;
      }
      cells.push({
        x,
        y,
        length: 26 + random() * 34,
        sway: -0.7 + random() * 1.4,
      });
    }
    game.hairCells = cells;
  }

  function buildStageData() {
    buildMudSpots();
    buildRepairGuide();
    buildHairCells();
  }

  function loadOptionalImage(paths) {
    return new Promise((resolve) => {
      const tryNext = (index) => {
        if (index >= paths.length) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => tryNext(index + 1);
        img.src = paths[index];
      };
      tryNext(0);
    });
  }

  async function loadAssets() {
    const loaded = await Promise.all([
      loadOptionalImage([
        "assets/model/background.png",
        "assets/background.png",
        "assets/background.svg",
      ]),
      loadOptionalImage([
        "assets/model/logo_game.png",
        "assets/logo_game.png",
        "assets/logo_game.svg",
      ]),
      loadOptionalImage([
        "assets/model/logo_success.png",
        "assets/logo_success.png",
        "assets/logo_success.svg",
      ]),
      loadOptionalImage([
        "assets/model/dirty&wrapped.png",
        "assets/dirty&wrapped.png",
        "assets/model/dirty&wrapped.svg",
        "assets/dirty&wrapped.svg",
      ]),
      loadOptionalImage([
        "assets/model/clean&wrapped.png",
        "assets/model/clean&wrapped.svg",
      ]),
      loadOptionalImage([
        "assets/model/clean.png",
        "assets/model/clean.svg",
      ]),
      loadOptionalImage([
        "assets/model/hair_messy.png",
        "assets/model/hair_messy.svg",
      ]),
      loadOptionalImage([
        "assets/model/hair_clean.png",
        "assets/model/hair_clean.svg",
      ]),
      loadOptionalImage([
        "assets/model/finger.png",
        "assets/model/finger.svg",
      ]),
      loadOptionalImage([
        "assets/model/success.png",
        "assets/success.png",
        "assets/model/success.svg",
        "assets/success.svg",
      ]),
      loadOptionalImage([
        "assets/tools/ui_towel.png",
        "assets/ui_towel.png",
        "assets/tools/ui_towel.svg",
        "assets/ui_towel.svg",
      ]),
      loadOptionalImage([
        "assets/tools/ui_needle.png",
        "assets/ui_needle.png",
        "assets/tools/ui_needle.svg",
        "assets/ui_needle.svg",
      ]),
      loadOptionalImage([
        "assets/tools/ui_comb.png",
        "assets/ui_comb.png",
        "assets/tools/ui_comb.svg",
        "assets/ui_comb.svg",
      ]),
    ]);

    [
      assets.background,
      assets.logoGame,
      assets.logoSuccess,
      assets.dirty,
      assets.cleanWrapped,
      assets.clean,
      assets.hairMessy,
      assets.hairClean,
      assets.finger,
      assets.success,
      assets.towel,
      assets.needle,
      assets.comb,
    ] = loaded;

    applyLogoState();
    updateToolUi();
  }

  function setImgOrFallback(imgEl, fallbackEl, image, fallbackText) {
    if (image) {
      imgEl.src = image.src;
      imgEl.hidden = false;
      fallbackEl.classList.add("is-hidden");
    } else {
      imgEl.hidden = true;
      fallbackEl.classList.remove("is-hidden");
      fallbackEl.textContent = fallbackText;
    }
  }

  function applyLogoState() {
    const stageMeta = STAGES[game.stage];
    const logo = game.stage === 4 ? assets.logoSuccess : assets.logoGame;
    setImgOrFallback(logoImage, logoFallback, logo, stageMeta.fallbackLogo);
    setImgOrFallback(startLogoImage, startLogoFallback, assets.logoGame, "GROOMING & CLEAN-UP");
  }

  function updateToolUi() {
    const stageMeta = STAGES[game.stage];
    if (!stageMeta.tool) {
      toolDock.classList.add("is-hidden");
      return;
    }

    toolDock.classList.remove("is-hidden");
    const key = stageMeta.tool;
    const image = assets[key];
    const meta = TOOL_META[key];
    toolButton.style.background = `linear-gradient(180deg, #fff2cb, ${meta.color})`;

    if (image) {
      toolIcon.src = image.src;
      toolIcon.hidden = false;
      toolFallback.classList.add("is-hidden");
    } else {
      toolIcon.hidden = true;
      toolFallback.classList.remove("is-hidden");
      toolFallback.textContent = meta.fallback;
    }
  }

  function refreshUi() {
    const meta = STAGES[game.stage];
    stageChip.textContent = meta.chip;
    objectiveText.textContent = meta.objective;
    progressLabel.textContent = meta.progressLabel;
    progressValue.textContent = `${Math.round(game.progress * 100)}%`;
    progressFill.style.width = `${Math.round(game.progress * 100)}%`;
    applyLogoState();
    updateToolUi();
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function applyCleaning(x, y) {
    if (!isInsideCharacter(x, y)) {
      return;
    }
    let changed = false;
    game.mudSpots.forEach((spot, index) => {
      if (game.cleanedMud.has(index)) {
        return;
      }
      if (distance(x, y, spot.x, spot.y) <= spot.radius + 42) {
        game.cleanedMud.add(index);
        changed = true;
      }
    });
    if (changed) {
      game.progress = clamp(game.cleanedMud.size / game.mudSpots.length, 0, 1);
    }
  }

  function applyRepair(x, y) {
    let changed = false;
    game.repairPoints.forEach((point, index) => {
      if (game.stitched.has(index)) {
        return;
      }
      if (distance(x, y, point.x, point.y) <= 26) {
        game.stitched.add(index);
        changed = true;
      }
    });
    if (changed) {
      game.progress = clamp(game.stitched.size / game.repairPoints.length, 0, 1);
    }
  }

  function applyHair(x, y) {
    if (!isInEllipse(x, y, hairEllipse)) {
      return;
    }
    let changed = false;
    game.hairCells.forEach((cell, index) => {
      if (game.combedHair.has(index)) {
        return;
      }
      if (distance(x, y, cell.x, cell.y) <= 44) {
        game.combedHair.add(index);
        changed = true;
      }
    });
    if (changed) {
      game.progress = clamp(game.combedHair.size / game.hairCells.length, 0, 1);
    }
  }

  function tryCompleteStage() {
    if (game.progress < 0.995 || performance.now() < game.transitionUntil) {
      return;
    }

    game.transitionUntil = performance.now() + 650;
    if (game.stage < 3) {
      window.setTimeout(() => {
        game.stage += 1;
        game.progress = 0;
        refreshUi();
      }, 540);
      return;
    }

    window.setTimeout(() => {
      game.stage = 4;
      game.progress = 1;
      game.successStartedAt = performance.now();
      game.pointer.active = false;
      refreshUi();
    }, 540);
  }

  function handleInteraction(point) {
    if (game.stage === 1) {
      applyCleaning(point.x, point.y);
    } else if (game.stage === 2) {
      applyRepair(point.x, point.y);
    } else if (game.stage === 3) {
      applyHair(point.x, point.y);
    }

    if (game.progress !== game.lastProgressFrame) {
      refreshUi();
      game.lastProgressFrame = game.progress;
    }
    tryCompleteStage();
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (game.stage < 1 || game.stage > 3) {
      return;
    }
    event.preventDefault();
    const point = getCanvasPoint(event);
    game.pointer.active = true;
    game.pointer.id = event.pointerId;
    game.pointer.x = point.x;
    game.pointer.y = point.y;
    game.tutorialDismissed = true;
    canvas.setPointerCapture(event.pointerId);
    handleInteraction(point);
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = getCanvasPoint(event);
    game.pointer.x = point.x;
    game.pointer.y = point.y;
    if (!game.pointer.active || event.pointerId !== game.pointer.id) {
      return;
    }
    event.preventDefault();
    handleInteraction(point);
  });

  function endPointer(event) {
    if (game.pointer.id !== event.pointerId) {
      return;
    }
    game.pointer.active = false;
    game.pointer.id = null;
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", () => {
    game.pointer.active = false;
  });

  startButton.addEventListener("click", () => {
    startScreen.classList.add("is-hidden");
    game.stage = 1;
    game.progress = 0;
    refreshUi();
  });

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawBackground(now) {
    if (assets.background) {
      ctx.drawImage(assets.background, 0, 0, WIDTH, HEIGHT);
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#6cc6ef");
    gradient.addColorStop(0.46, "#98d8ef");
    gradient.addColorStop(1, "#ffd7bc");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(110, 160, 120, 0, Math.PI * 2);
    ctx.arc(610, 240, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(570, 980, 180, 0, Math.PI * 2);
    ctx.arc(120, 1120, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 246, 230, 0.5)";
    for (let i = 0; i < 12; i += 1) {
      const x = 90 + i * 48 + Math.sin(now * 0.0008 + i) * 12;
      const y = 1050 + Math.cos(now * 0.001 + i) * 16;
      ctx.beginPath();
      ctx.arc(x, y, 9 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCharacterCard() {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, 94, 170, 532, 946, 44);
    ctx.fill();

    ctx.fillStyle = "rgba(255,247,232,0.78)";
    roundRect(ctx, 108, 184, 504, 918, 38);
    ctx.fill();
    ctx.restore();
  }

  function drawPlaceholderCharacter(stage) {
    ctx.save();
    ctx.translate(0, 8);

    const skinTone = "#ffd6c5";
    const robeColor = stage >= 4 ? "#fb7e78" : "#6da6ba";
    const robeShade = stage >= 4 ? "#f35259" : "#4a7d91";
    const hairBase = stage >= 4 ? "#473226" : "#6d4834";

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(360, 1010, 170, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hairBase;
    ctx.beginPath();
    ctx.ellipse(hairEllipse.x, hairEllipse.y - 4, hairEllipse.rx + 14, hairEllipse.ry + 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.ellipse(face.x, face.y, face.rx, face.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f5bcb0";
    ctx.beginPath();
    ctx.ellipse(323, 405, 10, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(397, 405, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(230, 940);
    ctx.quadraticCurveTo(238, 630, 300, 560);
    ctx.lineTo(420, 560);
    ctx.quadraticCurveTo(482, 630, 490, 940);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = robeShade;
    ctx.beginPath();
    ctx.moveTo(330, 560);
    ctx.lineTo(360, 890);
    ctx.lineTo(390, 560);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skinTone;
    ctx.beginPath();
    roundRect(ctx, 322, 494, 76, 78, 24);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.moveTo(300, 565);
    ctx.lineTo(360, 648);
    ctx.lineTo(420, 565);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#3b2417";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(322, 380);
    ctx.quadraticCurveTo(344, 362, 366, 382);
    ctx.moveTo(354, 380);
    ctx.quadraticCurveTo(376, 362, 398, 382);
    ctx.stroke();

    ctx.fillStyle = "#3b2417";
    ctx.beginPath();
    ctx.arc(340, 420, 6, 0, Math.PI * 2);
    ctx.arc(380, 420, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#d97776";
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (stage >= 4) {
      ctx.moveTo(334, 470);
      ctx.quadraticCurveTo(360, 492, 388, 470);
    } else {
      ctx.moveTo(336, 475);
      ctx.quadraticCurveTo(360, 490, 384, 475);
    }
    ctx.stroke();

    if (stage >= 4) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(248, 308);
      ctx.quadraticCurveTo(280, 248, 336, 222);
      ctx.moveTo(472, 308);
      ctx.quadraticCurveTo(438, 246, 384, 224);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawImageCharacter(image) {
    ctx.save();
    roundRect(ctx, 120, 205, 480, 860, 36);
    ctx.clip();
    ctx.drawImage(image, 120, 205, 480, 860);
    ctx.restore();
  }

  function drawClippedOverlay(image, alpha) {
    if (!image || alpha <= 0) {
      return;
    }
    ctx.save();
    roundRect(ctx, 120, 205, 480, 860, 36);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, 120, 205, 480, 860);
    ctx.restore();
  }

  function drawStageCharacter() {
    if (game.stage === 1) {
      if (assets.dirty) {
        drawImageCharacter(assets.dirty);
      } else {
        drawPlaceholderCharacter(1);
      }
      return;
    }

    if (game.stage === 2) {
      if (assets.cleanWrapped) {
        drawImageCharacter(assets.cleanWrapped);
      } else if (assets.dirty) {
        drawImageCharacter(assets.dirty);
      } else {
        drawPlaceholderCharacter(2);
      }
      return;
    }

    if (game.stage === 3) {
      if (assets.clean) {
        drawImageCharacter(assets.clean);
      } else if (assets.cleanWrapped) {
        drawImageCharacter(assets.cleanWrapped);
      } else {
        drawPlaceholderCharacter(3);
      }

      if (assets.hairMessy || assets.hairClean) {
        drawClippedOverlay(assets.hairMessy, 1 - game.progress);
        drawClippedOverlay(assets.hairClean, Math.max(0.15, game.progress));
      }
      return;
    }

    if (assets.dirty) {
      drawImageCharacter(assets.dirty);
    } else {
      drawPlaceholderCharacter(game.stage);
    }
  }

  function drawMudOverlay() {
    game.mudSpots.forEach((spot, index) => {
      if (game.cleanedMud.has(index)) {
        return;
      }
      ctx.save();
      ctx.translate(spot.x, spot.y);
      ctx.rotate(spot.rot);
      ctx.scale(1, spot.scaleY);
      ctx.fillStyle = "rgba(87, 54, 33, 0.88)";
      ctx.beginPath();
      ctx.arc(0, 0, spot.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(121, 82, 57, 0.5)";
      ctx.beginPath();
      ctx.arc(-spot.radius * 0.24, -spot.radius * 0.15, spot.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawRepairGuide() {
    ctx.save();
    ctx.setLineDash([12, 12]);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    game.repairLines.forEach((line) => {
      ctx.beginPath();
      line.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    });
    ctx.restore();

    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#fff2cb";
    game.repairPoints.forEach((point, index) => {
      if (!game.stitched.has(index)) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(point.x - 7, point.y - 7);
      ctx.lineTo(point.x + 7, point.y + 7);
      ctx.moveTo(point.x + 7, point.y - 7);
      ctx.lineTo(point.x - 7, point.y + 7);
      ctx.stroke();
    });
  }

  function drawHairFrizz(now) {
    const remainingRatio = game.hairCells.length
      ? 1 - game.combedHair.size / game.hairCells.length
      : 0;
    ctx.save();
    ctx.strokeStyle = `rgba(89, 54, 36, ${0.18 + remainingRatio * 0.55})`;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    game.hairCells.forEach((cell, index) => {
      if (game.combedHair.has(index)) {
        return;
      }
      const wave = Math.sin(now * 0.004 + index * 0.7) * cell.sway * 9;
      ctx.beginPath();
      ctx.moveTo(cell.x - 5, cell.y - cell.length * 0.45);
      ctx.quadraticCurveTo(cell.x + wave, cell.y, cell.x - wave * 0.5, cell.y + cell.length * 0.45);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawToolFollower() {
    if (!game.pointer.active || game.stage < 1 || game.stage > 3) {
      return;
    }

    const tool = STAGES[game.stage].tool;
    const image = assets[tool];
    const x = game.pointer.x + 44;
    const y = game.pointer.y - 54;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.18);
    if (image) {
      ctx.drawImage(image, -44, -44, 88, 88);
    } else {
      ctx.fillStyle = TOOL_META[tool].color;
      roundRect(ctx, -44, -44, 88, 88, 22);
      ctx.fill();
      ctx.fillStyle = "#3c220f";
      ctx.font = "900 20px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(TOOL_META[tool].fallback, 0, 2);
    }
    ctx.restore();
  }

  function drawTutorial(now) {
    if (game.stage !== 1 || game.tutorialDismissed) {
      return;
    }

    const t = (now % 2200) / 2200;
    const startX = 260;
    const endX = 455;
    const x = startX + (endX - startX) * (t < 0.5 ? t * 2 : (1 - t) * 2);
    const y = 852 + Math.sin(t * Math.PI * 2) * 10;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(startX, 852);
    ctx.lineTo(endX, 852);
    ctx.stroke();

    ctx.setLineDash([]);
    if (assets.finger) {
      ctx.drawImage(assets.finger, x - 44, y - 74, 88, 88);
    } else {
      roundRect(ctx, x - 26, y - 30, 40, 58, 18);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fill();
      roundRect(ctx, x - 6, y - 72, 18, 50, 9);
      ctx.fill();
    }

    ctx.fillStyle = "#183046";
    ctx.font = "700 26px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("DRAG", 360, 915);
    ctx.restore();
  }

  function drawTransition(now) {
    if (now >= game.transitionUntil) {
      return;
    }
    const t = 1 - (game.transitionUntil - now) / 650;
    const alpha = Math.sin(t * Math.PI);
    ctx.save();
    ctx.fillStyle = `rgba(255, 252, 241, ${alpha * 0.34})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = `rgba(28, 34, 62, ${alpha})`;
    ctx.font = '900 48px Impact, "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(game.stage < 3 ? "NEXT STEP!" : "GORGEOUS!", WIDTH / 2, 620);
    ctx.restore();
  }

  function drawSuccess(now) {
    const elapsed = clamp((now - game.successStartedAt) / 900, 0, 1);
    const scale = 0.88 + easeOutBack(elapsed) * 0.12;
    const alpha = elapsed;

    ctx.save();
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = "#fff3dd";
    roundRect(ctx, 146, 208, 428, 152, 40);
    ctx.fill();
    ctx.restore();

    if (assets.success) {
      ctx.save();
      ctx.translate(WIDTH / 2, 648);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.drawImage(assets.success, -230, -430, 460, 820);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawPlaceholderCharacter(4);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = '900 42px Impact, "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("MAKEOVER COMPLETE", WIDTH / 2, 1020);
    ctx.font = "700 26px Trebuchet MS";
    ctx.fillText("부드럽게 정리된 룩이 완성됐어요.", WIDTH / 2, 1064);
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground(now);
    drawCharacterCard();

    if (game.stage === 4) {
      drawSuccess(now);
      return;
    }

    drawStageCharacter();

    if (game.stage === 1) {
      drawMudOverlay();
    }

    if (game.stage >= 2) {
      drawRepairGuide();
    }

    if (game.stage >= 3) {
      drawHairFrizz(now);
    }

    drawToolFollower();
    drawTutorial(now);
    drawTransition(now);
  }

  function loop(now) {
    draw(now);
    window.requestAnimationFrame(loop);
  }

  function init() {
    buildStageData();
    refreshUi();
    loadAssets().finally(() => {
      refreshUi();
      window.requestAnimationFrame(loop);
    });
  }

  init();
})();



