const createBoardSlots = (config) => {
  const slotCount = config.board.rows * config.board.columns;
  const slots = Array.from({ length: slotCount }, () => null);

  config.board.initialItems.forEach((entry) => {
    const index = entry.row * config.board.columns + entry.column;
    slots[index] = entry.itemId;
  });

  return slots;
};

const createItemMap = (config) => new Map(config.items.map((item) => [item.id, item]));

const getIndexFromCell = (config, row, column) => row * config.board.columns + column;

const resolveGuideIndex = (config, point) => getIndexFromCell(config, point.row, point.column);

export const resolveStage = (config, progress) =>
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

const createTile = ({ config, slotIndex, itemId, itemMap, popIndex, interactive, selectedIndex }) => {
  const tile = document.createElement("button");
  tile.className = "tile";
  tile.type = "button";
  tile.dataset.index = `${slotIndex}`;

  const pulse = document.createElement("span");
  pulse.className = "tile__pulse";

  if (!interactive) {
    tile.disabled = true;
  }

  if (!itemId) {
    tile.classList.add("is-empty");
    tile.setAttribute("aria-label", config.copy.emptySlotLabel);
    tile.append(pulse);
    return tile;
  }

  const item = itemMap.get(itemId);
  const image = document.createElement("img");
  image.className = "tile__image";
  image.src = item.image;
  image.alt = item.label;

  tile.setAttribute("aria-label", item.label);
  tile.append(image, pulse);

  if (slotIndex === popIndex) {
    tile.classList.add("is-pop");
  }

  if (slotIndex === selectedIndex) {
    tile.classList.add("is-selected");
  }

  return tile;
};

const updateGuidePosition = ({ guide, grid, config }) => {
  const fromIndex = resolveGuideIndex(config, config.board.guidePath.from);
  const toIndex = resolveGuideIndex(config, config.board.guidePath.to);
  const fromTile = grid.querySelector(`[data-index="${fromIndex}"]`);
  const toTile = grid.querySelector(`[data-index="${toIndex}"]`);

  if (!fromTile || !toTile) {
    return;
  }

  const gridRect = grid.getBoundingClientRect();
  const fromRect = fromTile.getBoundingClientRect();
  const toRect = toTile.getBoundingClientRect();
  const half = 0.5;

  document.documentElement.style.setProperty(
    "--guide-from-x",
    `${fromRect.left - gridRect.left + fromRect.width * half}px`
  );
  document.documentElement.style.setProperty(
    "--guide-from-y",
    `${fromRect.top - gridRect.top + fromRect.height * half}px`
  );
  document.documentElement.style.setProperty(
    "--guide-to-x",
    `${toRect.left - gridRect.left + toRect.width * half}px`
  );
  document.documentElement.style.setProperty(
    "--guide-to-y",
    `${toRect.top - gridRect.top + toRect.height * half}px`
  );

  guide.classList.remove("is-hidden");
};

export const createMergeGame = ({ mount, config, resolveStage: resolveStageFromMain, onStateChange }) => {
  const itemMap = createItemMap(config);
  let board = createBoardSlots(config);
  const dragState = {
    activeIndex: null,
    selectedIndex: null,
    floatingTile: null,
    startX: 0,
    startY: 0,
    didDrag: false,
    interactionStarted: false,
    completed: false,
    interactionEnabled: false
  };
  let progress = 0;
  let popIndex = null;

  const header = document.createElement("div");
  header.className = "board-panel__header";

  const headingWrap = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "board-panel__eyebrow";

  const title = document.createElement("h2");
  title.className = "board-panel__title";

  const subtitle = document.createElement("p");
  subtitle.className = "board-panel__subtitle";

  headingWrap.append(eyebrow, title, subtitle);

  const counter = document.createElement("div");
  counter.className = "board-panel__counter";

  header.append(headingWrap, counter);

  const playfield = document.createElement("div");
  playfield.className = "board-panel__playfield";

  const grid = document.createElement("div");
  grid.className = "board-panel__grid";

  const guide = document.createElement("div");
  guide.className = "board-panel__guide";

  const guideImage = document.createElement("img");
  guideImage.className = "board-panel__guide-image";
  guideImage.src = config.assets.ui.guide.path;
  guideImage.alt = config.assets.ui.guide.alt;

  guide.append(guideImage);
  playfield.append(grid, guide);
  mount.replaceChildren(header, playfield);

  const updateStatus = () => {
    const stage = resolveStageFromMain(config, progress);
    eyebrow.textContent = dragState.completed ? config.copy.completeEyebrow : config.copy.boardEyebrow;
    title.textContent = dragState.completed ? config.copy.completeTitle : config.copy.boardTitle;
    subtitle.textContent = dragState.completed ? config.copy.completeMessage : stage.description;
    counter.textContent = renderCounter(config, progress);
    mount.classList.toggle("is-locked", !dragState.interactionEnabled && !dragState.completed);
    mount.classList.toggle("is-complete", dragState.completed);
  };

  const clearFloatingTile = () => {
    if (!dragState.floatingTile) {
      return;
    }
    dragState.floatingTile.remove();
    dragState.floatingTile = null;
  };

  const createFloatingTile = (itemId) => {
    const item = itemMap.get(itemId);
    const image = document.createElement("img");
    image.className = "floating-tile";
    image.src = item.image;
    image.alt = item.label;
    document.body.append(image);
    dragState.floatingTile = image;
  };

  const positionFloatingTile = (event) => {
    if (!dragState.floatingTile) {
      return;
    }
    dragState.floatingTile.style.left = `${event.clientX}px`;
    dragState.floatingTile.style.top = `${event.clientY}px`;
  };

  const renderBoard = () => {
    const fragment = document.createDocumentFragment();
    board.forEach((itemId, slotIndex) => {
      fragment.append(
        createTile({
          config,
          slotIndex,
          itemId,
          itemMap,
          popIndex,
          interactive: dragState.interactionEnabled && !dragState.completed,
          selectedIndex: dragState.selectedIndex
        })
      );
    });

    grid.replaceChildren(fragment);
    popIndex = null;

    if (dragState.interactionEnabled && !dragState.interactionStarted && !dragState.completed) {
      requestAnimationFrame(() => {
        updateGuidePosition({ guide, grid, config });
      });
      return;
    }

    guide.classList.add("is-hidden");
  };

  const syncState = () => {
    updateStatus();
    onStateChange({
      progress,
      completed: dragState.completed
    });
  };

  const completeIfNeeded = (mergedItemId) => {
    if (
      mergedItemId === config.progression.completeItemId ||
      progress >= config.progression.maxProgress
    ) {
      dragState.completed = true;
      dragState.interactionEnabled = false;
      guide.classList.add("is-hidden");
    }
  };

  const handleDrop = (sourceIndex, targetIndex) => {
    if (sourceIndex === null || targetIndex === null || sourceIndex === targetIndex) {
      return;
    }

    const sourceItemId = board[sourceIndex];
    const targetItemId = board[targetIndex];

    if (!sourceItemId) {
      return;
    }

    if (!targetItemId && config.board.allowMoveToEmpty) {
      board[targetIndex] = sourceItemId;
      board[sourceIndex] = null;
      return;
    }

    if (targetItemId === sourceItemId) {
      const nextItemId = itemMap.get(sourceItemId).next;
      if (!nextItemId) {
        return;
      }
      board[sourceIndex] = null;
      board[targetIndex] = nextItemId;
      progress += 1;
      popIndex = targetIndex;
      completeIfNeeded(nextItemId);
      return;
    }

    if (!config.board.allowSwap) {
      return;
    }

    board[sourceIndex] = targetItemId;
    board[targetIndex] = sourceItemId;
  };

  const finishInteraction = (event) => {
    const sourceIndex = dragState.activeIndex;
    if (sourceIndex === null) {
      return;
    }

    if (dragState.didDrag) {
      const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tile");
      const targetIndex = dropTarget ? Number(dropTarget.dataset.index) : null;

      handleDrop(sourceIndex, targetIndex);
      dragState.selectedIndex = null;
    } else {
      const tappedIndex = sourceIndex;
      const tappedItemId = board[tappedIndex];

      if (dragState.selectedIndex === null) {
        if (tappedItemId) {
          dragState.selectedIndex = tappedIndex;
          dragState.interactionStarted = true;
          guide.classList.add("is-hidden");
        }
      } else if (dragState.selectedIndex === tappedIndex) {
        dragState.selectedIndex = null;
      } else {
        handleDrop(dragState.selectedIndex, tappedIndex);
        dragState.selectedIndex = null;
      }
    }

    dragState.activeIndex = null;
    dragState.didDrag = false;
    clearFloatingTile();
    renderBoard();
    syncState();
  };

  const handlePointerDown = (event) => {
    if (!dragState.interactionEnabled || dragState.completed) {
      return;
    }

    const tile = event.target.closest(".tile");
    if (!tile) {
      return;
    }

    if (tile.classList.contains("is-empty") && dragState.selectedIndex === null) {
      return;
    }

    dragState.activeIndex = Number(tile.dataset.index);
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.didDrag = false;
    tile.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (dragState.activeIndex === null) {
      return;
    }

    if (!dragState.didDrag) {
      const distanceX = event.clientX - dragState.startX;
      const distanceY = event.clientY - dragState.startY;
      const distance = Math.hypot(distanceX, distanceY);

      if (distance < config.board.dragThresholdPx) {
        return;
      }

      if (!board[dragState.activeIndex]) {
        return;
      }

      dragState.didDrag = true;
      dragState.interactionStarted = true;
      dragState.selectedIndex = null;
      guide.classList.add("is-hidden");
      createFloatingTile(board[dragState.activeIndex]);
      const activeTile = grid.querySelector(`[data-index="${dragState.activeIndex}"]`);
      activeTile?.classList.add("is-dragging");
    }

    positionFloatingTile(event);
  };

  const handlePointerEnd = (event) => {
    const activeTile = grid.querySelector(".tile.is-dragging");
    if (activeTile) {
      activeTile.classList.remove("is-dragging");
    }
    finishInteraction(event);
  };

  const resizeObserver = new ResizeObserver(() => {
    if (dragState.interactionEnabled && !dragState.interactionStarted && !dragState.completed) {
      updateGuidePosition({ guide, grid, config });
    }
  });

  grid.addEventListener("pointerdown", handlePointerDown);
  grid.addEventListener("pointermove", handlePointerMove);
  grid.addEventListener("pointerup", handlePointerEnd);
  grid.addEventListener("pointercancel", handlePointerEnd);
  resizeObserver.observe(grid);

  const reset = () => {
    board = createBoardSlots(config);
    dragState.activeIndex = null;
    dragState.selectedIndex = null;
    dragState.startX = 0;
    dragState.startY = 0;
    dragState.didDrag = false;
    dragState.interactionStarted = false;
    dragState.completed = false;
    clearFloatingTile();
    progress = 0;
    popIndex = null;
    renderBoard();
    syncState();
  };

  const setInteractionEnabled = (enabled) => {
    dragState.interactionEnabled = enabled;
    dragState.selectedIndex = null;
    renderBoard();
    updateStatus();
  };

  renderBoard();
  syncState();

  return {
    reset,
    setInteractionEnabled
  };
};
