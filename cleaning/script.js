const CTA_URL = "https://apps.apple.com/";
const CLEAN_TARGET = 90;
const PROGRESS_CANVAS_SIZE = 256;

const tools = [
  {
    id: "cream",
    label: "광택 크림",
    shortLabel: "크림",
    description: "찌든 얼룩을 부드럽게 녹여내는 광택용 도구",
    asset: "./assets/tools/cream-icon.png",
  },
  {
    id: "chisel",
    label: "스크래퍼",
    shortLabel: "스크래퍼",
    description: "굳은 진흙과 녹 자국을 긁어내는 헤드",
    asset: "./assets/tools/chisel-icon.png",
  },
  {
    id: "razor",
    label: "면도기",
    shortLabel: "면도기",
    description: "가벼운 잔여물을 깔끔하게 벗겨내는 도구",
    asset: "./assets/tools/razor-icon.png",
  },
  {
    id: "scissors",
    label: "가위",
    shortLabel: "가위",
    description: "덩어리진 이물질을 잘라내는 정리 도구",
    asset: "./assets/tools/scissors-icon.png",
  },
  {
    id: "screwdriver",
    label: "드릴 브러시",
    shortLabel: "드릴",
    description: "단단한 표면을 빠르게 털어내는 회전 브러시",
    asset: "./assets/tools/screwdriver-icon.png",
  },
];

const vehicles = [
  {
    id: "car",
    label: "빈티지 카",
    teaser: "매끈한 차체에 눌어붙은 얼룩이 가득합니다.",
    dirty: "./assets/model/car-dirty.png",
    clean: "./assets/model/car-clean.png",
    correctTool: "cream",
    hint: "차체 얼룩은 광택 크림이 가장 잘 먹혀요.",
    completion: "광택 크림으로 차체의 오염을 거의 모두 제거했습니다.",
  },
  {
    id: "tank",
    label: "아머 탱크",
    teaser: "굳어버린 진흙층이 장갑 표면에 달라붙어 있습니다.",
    dirty: "./assets/model/tank-dirty.png",
    clean: "./assets/model/tank-clean.png",
    correctTool: "chisel",
    hint: "탱크 장갑처럼 단단한 표면은 스크래퍼가 맞습니다.",
    completion: "스크래퍼로 탱크 표면의 굳은 오염을 정리했습니다.",
  },
  {
    id: "airplane",
    label: "제트 비행기",
    teaser: "기체 곳곳에 붙은 찌꺼기 때문에 속도가 떨어질 것 같아요.",
    dirty: "./assets/model/airplane-dirty.png",
    clean: "./assets/model/airplane-clean.png",
    correctTool: "screwdriver",
    hint: "비행기 표면의 잔여물은 드릴 브러시로 털어내 보세요.",
    completion: "드릴 브러시로 기체 표면을 깨끗하게 복원했습니다.",
  },
];

const state = {
  vehicleId: null,
  selectedToolId: null,
  isDrawing: false,
  completed: false,
  brushSizeRatio: 0.08,
  scratchPoints: [],
  images: new Map(),
  initialAlphaSum: 0,
  lastPointer: null,
  particleTick: 0,
  measureTick: 0,
  completedVehicles: new Set(),
};

const selectionPanel = document.getElementById("selectionPanel");
const vehicleGrid = document.getElementById("vehicleGrid");
const gamePanel = document.getElementById("gamePanel");
const toolList = document.getElementById("toolList");
const completedCount = document.getElementById("completedCount");
const cleanImage = document.getElementById("cleanImage");
const dirtyCanvas = document.getElementById("dirtyCanvas");
const stage = document.getElementById("stage");
const stageCopy = document.getElementById("stageCopy");
const selectedVehicleLabel = document.getElementById("selectedVehicleLabel");
const selectedToolLabel = document.getElementById("selectedToolLabel");
const hintText = document.getElementById("hintText");
const progressValue = document.getElementById("progressValue");
const progressFill = document.getElementById("progressFill");
const roundTitle = document.getElementById("roundTitle");
const particleLayer = document.getElementById("particleLayer");
const completionModal = document.getElementById("completionModal");
const completionText = document.getElementById("completionText");
const completionTitle = document.getElementById("completionTitle");
const nextButton = document.getElementById("nextButton");
const retryButton = document.getElementById("retryButton");
const backButton = document.getElementById("backButton");
const ctaButton = document.getElementById("ctaButton");

const dirtyContext = dirtyCanvas.getContext("2d", { willReadFrequently: false });
const progressCanvas = document.createElement("canvas");
progressCanvas.width = PROGRESS_CANVAS_SIZE;
progressCanvas.height = PROGRESS_CANVAS_SIZE;
const progressContext = progressCanvas.getContext("2d", { willReadFrequently: true });

function preloadImage(src) {
  if (state.images.has(src)) {
    return Promise.resolve(state.images.get(src));
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      state.images.set(src, image);
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
  });
}

function getVehicle() {
  return vehicles.find((vehicle) => vehicle.id === state.vehicleId) ?? null;
}

function getTool(toolId = state.selectedToolId) {
  return tools.find((tool) => tool.id === toolId) ?? null;
}

function getContainRect(imageWidth, imageHeight, boxWidth, boxHeight) {
  const imageRatio = imageWidth / imageHeight;
  const boxRatio = boxWidth / boxHeight;

  if (imageRatio > boxRatio) {
    const width = boxWidth;
    const height = width / imageRatio;
    return { x: 0, y: (boxHeight - height) / 2, width, height };
  }

  const height = boxHeight;
  const width = height * imageRatio;
  return { x: (boxWidth - width) / 2, y: 0, width, height };
}

function getBrushRadius(boxWidth, boxHeight) {
  return Math.min(boxWidth, boxHeight) * state.brushSizeRatio;
}

function updateStageCopy(title, body, isActive) {
  stage.classList.toggle("is-active", Boolean(isActive));
  stageCopy.querySelector(".stage-copy-title").textContent = title;
  stageCopy.querySelector(".stage-copy-body").textContent = body;
}

function updateProgress(value) {
  const clamped = Math.max(0, Math.min(100, value));
  progressValue.textContent = `${Math.round(clamped)}%`;
  progressFill.style.width = `${clamped}%`;
}

function updateCompletedCounter() {
  completedCount.textContent = `${state.completedVehicles.size} / ${vehicles.length}`;
}

function getNextVehicleId() {
  const currentIndex = vehicles.findIndex((vehicle) => vehicle.id === state.vehicleId);
  const ordered = currentIndex >= 0 ? [...vehicles.slice(currentIndex + 1), ...vehicles.slice(0, currentIndex + 1)] : vehicles;
  const nextVehicle = ordered.find((vehicle) => !state.completedVehicles.has(vehicle.id));
  return nextVehicle?.id ?? null;
}

function renderVehicleCards() {
  vehicleGrid.innerHTML = "";

  vehicles.forEach((vehicle) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vehicle-card";
    button.dataset.vehicleId = vehicle.id;
    button.innerHTML = `
      <div class="vehicle-preview">
        <img src="${vehicle.dirty}" alt="${vehicle.label}" />
      </div>
      <div class="vehicle-meta">
        <span class="vehicle-tag">목표 ${CLEAN_TARGET}% 정리</span>
        <h3>${vehicle.label}</h3>
        <p>${vehicle.teaser}</p>
      </div>
    `;
    button.addEventListener("click", () => startRound(vehicle.id));
    vehicleGrid.appendChild(button);
  });

  markSelectedVehicle();
}

function renderToolButtons() {
  toolList.innerHTML = "";

  tools.forEach((tool) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tool-button";
    button.dataset.toolId = tool.id;
    button.innerHTML = `
      <span class="tool-icon-wrap">
        <img src="${tool.asset}" alt="${tool.label}" />
      </span>
      <span class="tool-copy">
        <strong>${tool.label}</strong>
        <span>${tool.description}</span>
      </span>
    `;
    button.addEventListener("click", () => selectTool(tool.id));
    toolList.appendChild(button);
  });
}

function markSelectedVehicle() {
  vehicleGrid.querySelectorAll(".vehicle-card").forEach((card) => {
    card.classList.toggle("is-complete", state.completedVehicles.has(card.dataset.vehicleId));
    card.classList.toggle("is-selected", card.dataset.vehicleId === state.vehicleId);
  });
}

function markSelectedTool() {
  toolList.querySelectorAll(".tool-button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.toolId === state.selectedToolId);
  });
}

function showGamePanel() {
  gamePanel.classList.remove("is-hidden");
  gamePanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetRoundState() {
  state.selectedToolId = null;
  state.isDrawing = false;
  state.completed = false;
  state.scratchPoints = [];
  state.lastPointer = null;
  state.particleTick = 0;
  state.measureTick = 0;
  state.initialAlphaSum = 0;
  stage.classList.remove("is-complete");
  markSelectedTool();
  selectedToolLabel.textContent = "없음";
  updateProgress(0);
  completionModal.classList.add("is-hidden");
}

async function startRound(vehicleId) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  if (!vehicle) {
    return;
  }

  resetRoundState();
  state.vehicleId = vehicleId;
  selectedVehicleLabel.textContent = vehicle.label;
  hintText.textContent = vehicle.hint;
  roundTitle.textContent = `${vehicle.label}의 오염을 정리하세요`;
  cleanImage.src = vehicle.clean;
  completionText.textContent = vehicle.completion;
  completionTitle.textContent = "메이크오버 완료";
  markSelectedVehicle();
  showGamePanel();
  updateStageCopy("도구를 먼저 선택하세요", "알맞은 도구를 탭한 뒤 오염된 부분을 문질러 주세요.", false);

  await Promise.all([preloadImage(vehicle.clean), preloadImage(vehicle.dirty)]);
  resizeStage();
}

function selectTool(toolId) {
  const vehicle = getVehicle();
  const tool = getTool(toolId);

  if (!vehicle || !tool) {
    return;
  }

  state.selectedToolId = toolId;
  selectedToolLabel.textContent = tool.shortLabel;
  hintText.textContent =
    toolId === vehicle.correctTool
      ? `${tool.label} 준비 완료. 화면을 드래그해서 오염 레이어를 지워보세요.`
      : `${tool.label}는 반응하지 않습니다. 다른 도구를 골라보세요.`;

  updateStageCopy(
    toolId === vehicle.correctTool ? "문질러서 정리하세요" : "이 도구는 맞지 않아요",
    toolId === vehicle.correctTool
      ? "오염이 있는 부분을 길게 드래그하면 깨끗한 이미지만 남습니다."
      : "표면과 맞는 도구를 골라야 오염 레이어가 지워집니다.",
    toolId === vehicle.correctTool
  );

  markSelectedTool();
}

function resizeCanvasToDisplaySize(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawDirtyBase() {
  const vehicle = getVehicle();

  if (!vehicle) {
    dirtyContext.clearRect(0, 0, dirtyCanvas.width, dirtyCanvas.height);
    progressContext.clearRect(0, 0, PROGRESS_CANVAS_SIZE, PROGRESS_CANVAS_SIZE);
    return;
  }

  const dirtyImage = state.images.get(vehicle.dirty);

  if (!dirtyImage) {
    return;
  }

  const stageRect = dirtyCanvas.getBoundingClientRect();
  const visibleRect = getContainRect(dirtyImage.width, dirtyImage.height, stageRect.width, stageRect.height);
  dirtyContext.clearRect(0, 0, stageRect.width, stageRect.height);
  dirtyContext.drawImage(dirtyImage, visibleRect.x, visibleRect.y, visibleRect.width, visibleRect.height);

  progressContext.clearRect(0, 0, PROGRESS_CANVAS_SIZE, PROGRESS_CANVAS_SIZE);
  const maskRect = getContainRect(dirtyImage.width, dirtyImage.height, PROGRESS_CANVAS_SIZE, PROGRESS_CANVAS_SIZE);
  progressContext.drawImage(dirtyImage, maskRect.x, maskRect.y, maskRect.width, maskRect.height);
  state.initialAlphaSum = computeAlphaSum();
}

function stampCircle(context, x, y, radius) {
  const gradient = context.createRadialGradient(x, y, radius * 0.12, x, y, radius);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.72)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.beginPath();
  context.fillStyle = gradient;
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function eraseAtPoint(x, y, radius, persist = true) {
  const stageRect = dirtyCanvas.getBoundingClientRect();
  const maskX = (x / stageRect.width) * PROGRESS_CANVAS_SIZE;
  const maskY = (y / stageRect.height) * PROGRESS_CANVAS_SIZE;
  const maskRadius = (radius / Math.min(stageRect.width, stageRect.height)) * PROGRESS_CANVAS_SIZE;

  dirtyContext.save();
  dirtyContext.globalCompositeOperation = "destination-out";
  stampCircle(dirtyContext, x, y, radius);
  dirtyContext.restore();

  progressContext.save();
  progressContext.globalCompositeOperation = "destination-out";
  stampCircle(progressContext, maskX, maskY, maskRadius);
  progressContext.restore();

  if (persist) {
    state.scratchPoints.push({
      x: x / stageRect.width,
      y: y / stageRect.height,
      radius: radius / Math.min(stageRect.width, stageRect.height),
    });
  }
}

function replayScratchPoints() {
  const stageRect = dirtyCanvas.getBoundingClientRect();
  const minDimension = Math.min(stageRect.width, stageRect.height);

  state.scratchPoints.forEach((point) => {
    eraseAtPoint(point.x * stageRect.width, point.y * stageRect.height, point.radius * minDimension, false);
  });
}

function computeAlphaSum() {
  const { data } = progressContext.getImageData(0, 0, PROGRESS_CANVAS_SIZE, PROGRESS_CANVAS_SIZE);
  let alphaTotal = 0;

  for (let index = 3; index < data.length; index += 4) {
    alphaTotal += data[index];
  }

  return alphaTotal;
}

function measureProgress(force = false) {
  state.measureTick += 1;

  if (!force && state.measureTick % 6 !== 0) {
    return;
  }

  if (!state.initialAlphaSum) {
    updateProgress(0);
    return;
  }

  const currentAlphaSum = computeAlphaSum();
  const cleanPercent = ((state.initialAlphaSum - currentAlphaSum) / state.initialAlphaSum) * 100;
  updateProgress(cleanPercent);

  if (cleanPercent >= CLEAN_TARGET && !state.completed) {
    completeRound(cleanPercent);
  }
}

function completeRound(cleanPercent) {
  const vehicle = getVehicle();

  if (!vehicle) {
    return;
  }

  state.completed = true;
  state.isDrawing = false;
  state.completedVehicles.add(vehicle.id);
  stage.classList.add("is-complete");
  updateCompletedCounter();
  markSelectedVehicle();
  updateProgress(cleanPercent);
  hintText.textContent = `${vehicle.label} 정리 완료. CTA 버튼으로 전환할 수 있습니다.`;
  updateStageCopy("정리 완료", "깨끗해진 결과를 확인하고 다음 단계로 이동해 보세요.", true);
  const nextVehicleId = getNextVehicleId();
  const allCompleted = state.completedVehicles.size === vehicles.length;

  completionTitle.textContent = allCompleted ? "모든 대상 정리 완료" : "메이크오버 완료";
  completionText.textContent = allCompleted
    ? `세 가지 대상을 모두 복원했습니다. 마지막으로 CTA를 눌러 전환 흐름까지 확인해 보세요.`
    : `${vehicle.completion} 정리율 ${Math.round(cleanPercent)}% 달성.`;
  nextButton.disabled = allCompleted;
  nextButton.hidden = allCompleted;
  nextButton.dataset.nextVehicleId = nextVehicleId ?? "";
  completionModal.classList.remove("is-hidden");
}

function getLocalPoint(event) {
  const rect = dirtyCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    rect,
  };
}

function pulseRejectedTool() {
  const selected = toolList.querySelector(`[data-tool-id="${state.selectedToolId}"]`);

  if (!selected) {
    return;
  }

  selected.classList.remove("is-blocked");
  window.requestAnimationFrame(() => {
    selected.classList.add("is-blocked");
    window.setTimeout(() => selected.classList.remove("is-blocked"), 220);
  });
}

function spawnParticle(x, y) {
  state.particleTick += 1;

  if (state.particleTick % 2 !== 0) {
    return;
  }

  const particle = document.createElement("span");
  particle.className = "particle";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.setProperty("--drift-x", `${(Math.random() - 0.5) * 26}px`);
  particle.style.setProperty("--drift-y", `${-18 - Math.random() * 20}px`);
  particleLayer.appendChild(particle);
  particle.addEventListener("animationend", () => particle.remove(), { once: true });
}

function applyBrushStroke(fromPoint, toPoint) {
  const radius = getBrushRadius(fromPoint.rect.width, fromPoint.rect.height);
  const distance = Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(8, radius * 0.35)));

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const x = fromPoint.x + (toPoint.x - fromPoint.x) * progress;
    const y = fromPoint.y + (toPoint.y - fromPoint.y) * progress;
    eraseAtPoint(x, y, radius, true);
    spawnParticle(x, y);
  }

  measureProgress();
}

function handlePointerStart(event) {
  const vehicle = getVehicle();

  if (!vehicle || state.completed) {
    return;
  }

  if (!state.selectedToolId) {
    hintText.textContent = "먼저 도구를 선택해야 문지르기가 활성화됩니다.";
    updateStageCopy("도구가 필요합니다", "오른쪽 또는 하단의 도구를 선택한 뒤 다시 시도해 주세요.", false);
    return;
  }

  if (state.selectedToolId !== vehicle.correctTool) {
    hintText.textContent = "이 도구는 반응하지 않습니다. 다른 도구를 골라보세요.";
    pulseRejectedTool();
    return;
  }

  const point = getLocalPoint(event);
  state.isDrawing = true;
  state.lastPointer = point;
  dirtyCanvas.setPointerCapture(event.pointerId);
  applyBrushStroke(point, point);
}

function handlePointerMove(event) {
  if (!state.isDrawing || state.completed) {
    return;
  }

  const point = getLocalPoint(event);
  applyBrushStroke(state.lastPointer, point);
  state.lastPointer = point;
}

function handlePointerEnd(event) {
  if (!state.isDrawing) {
    return;
  }

  state.isDrawing = false;
  state.lastPointer = null;

  if (dirtyCanvas.hasPointerCapture(event.pointerId)) {
    dirtyCanvas.releasePointerCapture(event.pointerId);
  }

  measureProgress(true);
}

function resizeStage() {
  if (!state.vehicleId) {
    return;
  }

  resizeCanvasToDisplaySize(dirtyCanvas, dirtyContext);
  drawDirtyBase();
  replayScratchPoints();
  measureProgress(true);
}

retryButton.addEventListener("click", () => {
  completionModal.classList.add("is-hidden");

  if (state.vehicleId) {
    startRound(state.vehicleId);
  }
});

nextButton.addEventListener("click", () => {
  const nextVehicleId = nextButton.dataset.nextVehicleId;
  completionModal.classList.add("is-hidden");

  if (nextVehicleId) {
    startRound(nextVehicleId);
  }
});

backButton.addEventListener("click", () => {
  completionModal.classList.add("is-hidden");
  resetRoundState();
  state.vehicleId = null;
  cleanImage.removeAttribute("src");
  selectedVehicleLabel.textContent = "-";
  hintText.textContent = "대상을 먼저 골라주세요.";
  roundTitle.textContent = "도구를 고르고 오염을 제거하세요";
  updateStageCopy("도구를 먼저 선택하세요", "오른쪽 또는 하단 툴바에서 알맞은 도구를 고르면 문지르기가 시작됩니다.", false);
  markSelectedVehicle();
  dirtyContext.clearRect(0, 0, dirtyCanvas.width, dirtyCanvas.height);
  selectionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

ctaButton.href = CTA_URL;

dirtyCanvas.addEventListener("pointerdown", handlePointerStart);
dirtyCanvas.addEventListener("pointermove", handlePointerMove);
dirtyCanvas.addEventListener("pointerup", handlePointerEnd);
dirtyCanvas.addEventListener("pointercancel", handlePointerEnd);
dirtyCanvas.addEventListener("lostpointercapture", () => {
  state.isDrawing = false;
  state.lastPointer = null;
});

window.addEventListener("resize", () => {
  if (!state.vehicleId) {
    return;
  }

  window.clearTimeout(window.__cleaningResizeTimer);
  window.__cleaningResizeTimer = window.setTimeout(() => resizeStage(), 80);
});

renderVehicleCards();
renderToolButtons();
updateCompletedCounter();
