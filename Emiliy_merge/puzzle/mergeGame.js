const createItemMap = (config) => new Map(config.items.map((item) => [item.id, item]));

const getIndexFromCell = (config, row, column) => row * config.board.columns + column;

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

const createMergeableSet = (board, itemMap) => {
  const counts = new Map();

  board.forEach((cell) => {
    if (!cell || cell.disabled || !itemMap.get(cell.itemId)?.next) {
      return;
    }
    counts.set(cell.itemId, (counts.get(cell.itemId) ?? 0) + 1);
  });

  const mergeableIds = new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([itemId]) => itemId)
  );

  return new Set(
    board
      .map((cell, index) => (cell && !cell.disabled && mergeableIds.has(cell.itemId) ? index : null))
      .filter((index) => index !== null)
  );
};

const createGuidePair = (board, itemMap) => {
  const groups = new Map();

  board.forEach((cell, index) => {
    if (!cell || cell.disabled || !itemMap.get(cell.itemId)?.next) {
      return;
    }
    if (!groups.has(cell.itemId)) {
      groups.set(cell.itemId, []);
    }
    groups.get(cell.itemId).push(index);
  });

  for (const indices of groups.values()) {
    if (indices.length > 1) {
      return {
        fromIndex: indices[0],
        toIndex: indices[1]
      };
    }
  }

  return null;
};

const randomInt = (minimum, maximum) =>
  minimum + Math.floor(Math.random() * (maximum - minimum + 1));

const shuffle = (values) => {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const createBoardSlots = (config, itemMap) => {
  const slotCount = config.board.rows * config.board.columns;

  if (Array.isArray(config.board.activeSpawnRules) && config.board.activeSpawnRules.length > 0) {
    const attempts = config.board.randomSpawnMaxAttempts;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const slots = Array.from({ length: slotCount }, () => ({
        itemId: "deactivated",
        disabled: true
      }));
      const shuffledIndices = shuffle(Array.from({ length: slotCount }, (_, index) => index));
      let cursor = 0;

      config.board.activeSpawnRules.forEach((rule) => {
        const spawnCount = Math.min(randomInt(rule.min, rule.max), slotCount - cursor);

        for (let count = 0; count < spawnCount; count += 1) {
          slots[shuffledIndices[cursor]] = {
            itemId: rule.itemId,
            disabled: false
          };
          cursor += 1;
        }
      });

      if (createGuidePair(slots, itemMap)) {
        return slots;
      }
    }
  }

  const slots = Array.from({ length: slotCount }, () => null);

  config.board.initialItems.forEach((entry) => {
    const index = getIndexFromCell(config, entry.row, entry.column);
    slots[index] = {
      itemId: entry.itemId,
      disabled: false
    };
  });

  return slots;
};

const createTile = ({
  config,
  slotIndex,
  cell,
  itemMap,
  popIndex,
  interactive,
  selectedIndex,
  mergeableSet,
  guidedSet
}) => {
  const tile = document.createElement("button");
  tile.className = "tile";
  tile.type = "button";
  tile.dataset.index = `${slotIndex}`;

  const pulse = document.createElement("span");
  pulse.className = "tile__pulse";

  if (!interactive) {
    tile.disabled = true;
  }

  if (!cell) {
    tile.classList.add("is-empty");
    tile.setAttribute("aria-label", config.copy.emptySlotLabel);
    tile.append(pulse);
    return tile;
  }

  const item = cell.disabled
    ? config.assets.ui.deactivated
    : itemMap.get(cell.itemId);
  const image = document.createElement("img");
  image.className = "tile__image";
  image.src = cell.disabled ? item.path : item.image;
  image.alt = cell.disabled ? item.alt : item.label;

  tile.setAttribute("aria-label", cell.disabled ? item.alt : item.label);
  tile.append(image, pulse);

  if (cell.disabled) {
    tile.classList.add("is-deactivated");
    tile.disabled = true;
    return tile;
  }

  if (slotIndex === popIndex) {
    tile.classList.add("is-pop");
  }

  if (slotIndex === selectedIndex) {
    tile.classList.add("is-selected");
  }

  if (mergeableSet.has(slotIndex)) {
    tile.classList.add("is-mergeable");
  }

  if (guidedSet.has(slotIndex)) {
    tile.classList.add("is-guided");
  }

  return tile;
};

const updateGuidePosition = ({ guideElement, guidePair, grid, config }) => {
  const { fromIndex, toIndex } = guidePair;
  const fromTile = grid.querySelector(`[data-index="${fromIndex}"]`);
  const toTile = grid.querySelector(`[data-index="${toIndex}"]`);

  if (!fromTile || !toTile) {
    return;
  }

  const gridRect = grid.getBoundingClientRect();
  const fromRect = fromTile.getBoundingClientRect();
  const toRect = toTile.getBoundingClientRect();
  const half = config.board.guideAnchorRatio;

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

  guideElement.classList.remove("is-hidden");
};

export const createMergeGame = ({ mount, config, resolveStage: resolveStageFromMain, onStateChange }) => {
  const itemMap = createItemMap(config);
  let board = createBoardSlots(config, itemMap);
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
  let progress = config.progression.initialProgress;
  let popIndex = null;

  const header = document.createElement("div");
  header.className = "board-panel__header";

  const counter = document.createElement("div");
  counter.className = "board-panel__counter";

  header.append(counter);

  const playfield = document.createElement("div");
  playfield.className = "board-panel__playfield";

  const surface = document.createElement("div");
  surface.className = "board-panel__surface";

  const grid = document.createElement("div");
  grid.className = "board-panel__grid";

  const guide = document.createElement("div");
  guide.className = "board-panel__guide";

  const guideImage = document.createElement("img");
  guideImage.className = "board-panel__guide-image";
  guideImage.src = config.assets.ui.guide.path;
  guideImage.alt = config.assets.ui.guide.alt;

  guide.append(guideImage);
  surface.append(grid);
  playfield.append(surface, guide);
  mount.replaceChildren(header, playfield);

  const updateStatus = () => {
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
    const mergeableSet = createMergeableSet(board, itemMap);
    const guidePair =
      !dragState.interactionStarted && dragState.interactionEnabled && !dragState.completed
        ? createGuidePair(board, itemMap)
        : null;
    const guidedSet = guidePair
      ? new Set([guidePair.fromIndex, guidePair.toIndex])
      : new Set();

    board.forEach((cell, slotIndex) => {
      fragment.append(
        createTile({
          config,
          slotIndex,
          cell,
          itemMap,
          popIndex,
          interactive: dragState.interactionEnabled && !dragState.completed,
          selectedIndex: dragState.selectedIndex,
          mergeableSet,
          guidedSet
        })
      );
    });

    grid.replaceChildren(fragment);
    popIndex = null;

    if (dragState.interactionEnabled && !dragState.interactionStarted && !dragState.completed) {
      requestAnimationFrame(() => {
        if (guidePair) {
          updateGuidePosition({ guideElement: guide, guidePair, grid, config });
          return;
        }
        guide.classList.add("is-hidden");
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

    const sourceCell = board[sourceIndex];
    const targetCell = board[targetIndex];

    if (!sourceCell || sourceCell.disabled) {
      return;
    }

    if (!targetCell && config.board.allowMoveToEmpty) {
      board[targetIndex] = sourceCell;
      board[sourceIndex] = null;
      return;
    }

    if (!targetCell || targetCell.disabled) {
      return;
    }

    if (targetCell.itemId === sourceCell.itemId) {
      const nextItemId = itemMap.get(sourceCell.itemId).next;
      if (!nextItemId) {
        return;
      }
      board[sourceIndex] = null;
      board[targetIndex] = {
        itemId: nextItemId,
        disabled: false
      };
      progress += config.progression.incrementStep;
      popIndex = targetIndex;
      completeIfNeeded(nextItemId);
      return;
    }

    if (!config.board.allowSwap) {
      return;
    }

    board[sourceIndex] = targetCell;
    board[targetIndex] = sourceCell;
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
      const tappedCell = board[tappedIndex];

      if (dragState.selectedIndex === null) {
        if (tappedCell && !tappedCell.disabled) {
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

    if ((tile.classList.contains("is-empty") || tile.classList.contains("is-deactivated")) && dragState.selectedIndex === null) {
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

      if (!board[dragState.activeIndex] || board[dragState.activeIndex].disabled) {
        return;
      }

      dragState.didDrag = true;
      dragState.interactionStarted = true;
      dragState.selectedIndex = null;
      guide.classList.add("is-hidden");
      createFloatingTile(board[dragState.activeIndex].itemId);
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
      const guidePair = createGuidePair(board, itemMap);
      if (guidePair) {
        updateGuidePosition({ guideElement: guide, guidePair, grid, config });
        return;
      }
      guide.classList.add("is-hidden");
    }
  });

  grid.addEventListener("pointerdown", handlePointerDown);
  grid.addEventListener("pointermove", handlePointerMove);
  grid.addEventListener("pointerup", handlePointerEnd);
  grid.addEventListener("pointercancel", handlePointerEnd);
  resizeObserver.observe(grid);

  const reset = () => {
    board = createBoardSlots(config, itemMap);
    dragState.activeIndex = null;
    dragState.selectedIndex = null;
    dragState.startX = 0;
    dragState.startY = 0;
    dragState.didDrag = false;
    dragState.interactionStarted = false;
    dragState.completed = false;
    clearFloatingTile();
    progress = config.progression.initialProgress;
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
