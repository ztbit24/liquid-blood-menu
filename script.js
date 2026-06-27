// 1. DOM elemek
const svg = document.querySelector("#menuSvg");
const menuOverlay = document.querySelector("#menuOverlay");
const hitButton = document.querySelector("#hitButton");
const buttonShape = document.querySelector("#buttonShape");
const buttonText = document.querySelector("#buttonText");
const dropShape = document.querySelector("#dropShape");
const bridgeShape = document.querySelector("#bridgeShape");
const itemGroups = [...document.querySelectorAll(".menu-item")];

// 2. Állapot
const MODES = {
  IDLE: "idle",
  DRAGGING: "dragging",
  SNAP_BACK: "snapBack",
  DETACHING: "detaching",
  OPEN: "open",
  CLOSING: "closing",
};

const DRAG_OPEN_THRESHOLD = 96;
const DRAG_MAX_DISTANCE = 190;
const CLOSED_LABEL = "töröld le";
const DRAGGED_LABEL = "addj vért";

const state = {
  mode: MODES.IDLE,
  width: window.innerWidth,
  height: window.innerHeight,
  startTime: performance.now(),
  button: {
    cx: 0,
    cy: 0,
    w: 260,
    h: 92,
  },
  progress: 0,
  impulse: 0,
  pointer: {
    id: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  },
  reaction: {
    hoverIndex: null,
    activeIndex: null,
  },
  motion: {
    dropSway: 0,
  },
  animationFrame: null,
};

const items = [
  { label: "Élet", dx: -128, dy: 138, w: 126, h: 58 },
  { label: "Remény", dx: 128, dy: 138, w: 144, h: 58 },
  { label: "Erő", dx: -112, dy: 218, w: 116, h: 56 },
  { label: "Segítség", dx: 124, dy: 218, w: 154, h: 56 },
];

// 3. Segédfüggvények
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) =>
  t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

function isMode(...modes) {
  return modes.includes(state.mode);
}

function setMode(mode) {
  state.mode = mode;

  if (mode !== MODES.OPEN) {
    state.reaction.hoverIndex = null;
    state.reaction.activeIndex = null;
  }

  hitButton.setAttribute(
    "aria-expanded",
    String(isMode(MODES.DETACHING, MODES.OPEN))
  );
  syncOverlay();
}

function resetPointer() {
  state.pointer.id = null;
  state.pointer.startX = 0;
  state.pointer.startY = 0;
  state.pointer.currentX = 0;
  state.pointer.currentY = 0;
}

function dragDistanceFromEvent(event) {
  const deltaY = event.clientY - state.pointer.startY;
  return Math.max(0, deltaY);
}

function progressFromDrag(distance) {
  return clamp(distance / DRAG_MAX_DISTANCE, 0, 0.72);
}

function topButtonCenterY() {
  return Math.min(Math.max(92, state.height * 0.16), 132);
}

function syncHitTarget() {
  hitButton.style.left = `${state.button.cx}px`;
  hitButton.style.top = `${state.button.cy}px`;
  hitButton.style.width = `${state.button.w}px`;
  hitButton.style.height = `${state.button.h}px`;
}

function syncButtonLabel() {
  const isPulled = state.progress > 0.04 || !isMode(MODES.IDLE, MODES.SNAP_BACK);
  const label = isPulled ? DRAGGED_LABEL : CLOSED_LABEL;

  buttonText.textContent = label;
  hitButton.textContent = label;
  hitButton.setAttribute(
    "aria-label",
    isPulled ? "Vércsepp menü nyitása" : "Vércsepp menü lehúzása"
  );
}

function pointerDragX() {
  if (isMode(MODES.DRAGGING)) {
    return state.pointer.currentX - state.pointer.startX;
  }

  return state.motion.dropSway;
}

function itemReaction(index) {
  if (!isMode(MODES.OPEN)) {
    return 0;
  }

  if (state.reaction.activeIndex === index) {
    return 1;
  }

  return state.reaction.hoverIndex === index ? 0.62 : 0;
}

function syncOverlay() {
  const shouldShow = isMode(MODES.DETACHING, MODES.OPEN, MODES.CLOSING);

  if (shouldShow) {
    menuOverlay.hidden = false;
    requestAnimationFrame(() => {
      menuOverlay.classList.add("is-visible");
    });
    return;
  }

  menuOverlay.classList.remove("is-visible");
  menuOverlay.hidden = true;
}

function catmullRomPath(points) {
  let d = `M ${points[0].x} ${points[0].y}`;
  const size = points.length;

  for (let i = 0; i < size; i += 1) {
    const p0 = points[(i - 1 + size) % size];
    const p1 = points[i];
    const p2 = points[(i + 1) % size];
    const p3 = points[(i + 2) % size];

    const c1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };

    const c2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };

    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }

  return `${d} Z`;
}

// 4. Alakzat-generátorok
function wavySuperellipse({
  cx,
  cy,
  w,
  h,
  amp,
  phase,
  seed = 0,
  points = 56,
  power = 4,
}) {
  const result = [];
  const a = w / 2;
  const b = h / 2;

  for (let i = 0; i < points; i += 1) {
    const theta = (Math.PI * 2 * i) / points;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const x = a * Math.sign(cos) * Math.pow(Math.abs(cos), 2 / power);
    const y = b * Math.sign(sin) * Math.pow(Math.abs(sin), 2 / power);
    const wave =
      Math.sin(theta * 5 + phase + seed) * amp +
      Math.sin(theta * 9 - phase * 0.7 + seed * 1.7) * amp * 0.35;
    const len = Math.hypot(x / a, y / b) || 1;

    result.push({
      x: cx + x + (x / a / len) * wave,
      y: cy + y + (y / b / len) * wave,
    });
  }

  return catmullRomPath(result);
}

function dropPath(cx, cy, size, amp, phase) {
  const points = [];
  const rx = size * 0.36;
  const ry = size * 0.48;

  for (let i = 0; i < 48; i += 1) {
    const theta = (Math.PI * 2 * i) / 48;
    const topPull = Math.max(0, -Math.sin(theta)) * size * 0.16;
    const x = Math.cos(theta) * rx;
    const y = Math.sin(theta) * ry - topPull;
    const wave = Math.sin(theta * 6 + phase) * amp;
    const len = Math.hypot(x / rx, y / ry) || 1;

    points.push({
      x: cx + x + (x / rx / len) * wave,
      y: cy + y + (y / ry / len) * wave,
    });
  }

  return catmullRomPath(points);
}

function bridgePath(cx, topY, bottomY, topWidth, bottomWidth, amp, phase) {
  if (bottomY <= topY || topWidth < 1 || bottomWidth < 1) {
    return "";
  }

  const height = bottomY - topY;
  const waist = Math.max(10, Math.min(topWidth, bottomWidth) * 0.5);
  const pinchY = topY + height * 0.58;
  const wobble = Math.sin(phase * 1.4) * amp;

  const leftTop = { x: cx - topWidth / 2, y: topY };
  const rightTop = { x: cx + topWidth / 2, y: topY };
  const leftBottom = { x: cx - bottomWidth / 2, y: bottomY };
  const rightBottom = { x: cx + bottomWidth / 2, y: bottomY };
  const leftPinch = { x: cx - waist / 2 + wobble, y: pinchY };
  const rightPinch = { x: cx + waist / 2 + wobble, y: pinchY };

  return [
    "M",
    leftTop.x,
    leftTop.y,
    "C",
    cx - topWidth * 0.56,
    topY + height * 0.24,
    leftPinch.x,
    pinchY - height * 0.18,
    leftPinch.x,
    leftPinch.y,
    "C",
    leftPinch.x,
    pinchY + height * 0.2,
    leftBottom.x,
    bottomY - height * 0.28,
    leftBottom.x,
    leftBottom.y,
    "C",
    cx - bottomWidth * 0.18,
    bottomY + height * 0.08,
    cx + bottomWidth * 0.18,
    bottomY + height * 0.08,
    rightBottom.x,
    rightBottom.y,
    "C",
    rightBottom.x,
    bottomY - height * 0.28,
    rightPinch.x,
    pinchY + height * 0.2,
    rightPinch.x,
    rightPinch.y,
    "C",
    rightPinch.x,
    pinchY - height * 0.18,
    cx + topWidth * 0.56,
    topY + height * 0.24,
    rightTop.x,
    rightTop.y,
    "Z",
  ].join(" ");
}

// 5. Render
function resize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;

  svg.setAttribute("viewBox", `0 0 ${state.width} ${state.height}`);

  state.button.cx = state.width / 2;
  state.button.cy = topButtonCenterY();
  state.button.w = Math.min(276, state.width * 0.72);
  state.button.h = 92;
  syncHitTarget();

  render(performance.now());
}

function render(now) {
  const phase = (now - state.startTime) / 180;
  const p = state.progress;
  const isTransitioning = isMode(MODES.SNAP_BACK, MODES.DETACHING, MODES.CLOSING);
  const idleBreath = 1 + Math.sin(phase * 0.52) * 0.018;
  const idleLift = Math.sin(phase * 0.38) * 1.2 * (1 - p);
  const dragX = pointerDragX();
  const dropSway =
    clamp(dragX * 0.18, -18, 18) * (1 - p * 0.35) +
    Math.sin(phase * 0.9 + p * 2.4) * (4 + p * 8);
  const buttonPulse = isTransitioning
    ? state.impulse
    : 2.4 + Math.sin(phase * 0.7) * 1.2;
  const buttonAmp =
    buttonPulse * (1 - p * 0.45) +
    Math.sin(phase * 1.35) * 0.7 * (1 - p);
  const dropP = clamp(p / 0.46, 0, 1);
  const splitP = clamp((p - 0.58) / 0.42, 0, 1);
  const cx = state.button.cx;
  const cy = state.button.cy + idleLift;

  buttonShape.setAttribute(
    "d",
    wavySuperellipse({
      cx,
      cy,
      w: (state.button.w - splitP * 18) * idleBreath,
      h: (state.button.h - splitP * 8) * (2 - idleBreath),
      amp: buttonAmp,
      phase,
      seed: 0.4,
      power: 4.2,
    })
  );

  buttonText.setAttribute("x", cx);
  buttonText.setAttribute("y", cy + 1);
  buttonText.style.opacity = String(1 - splitP * 0.82);
  syncButtonLabel();

  const dropSize = lerp(4, 88, dropP) * (1 - splitP * 0.22);
  const dropX = cx + dropSway * dropP * (1 - splitP * 0.42);
  const dropY =
    cy +
    state.button.h / 2 +
    lerp(2, 92, dropP) -
    splitP * 18 +
    Math.sin(phase * 1.08) * 2.2 * dropP;
  const buttonBottom = cy + (state.button.h - splitP * 8) / 2 - 2;
  const dropTop = dropY - dropSize * 0.54;
  const bridgeP = clamp((p - 0.08) / 0.55, 0, 1);
  const tearP = clamp((p - 0.6) / 0.18, 0, 1);
  const bridgeWave = Math.sin(phase * 1.65 + dropP * 2) * 3.5 * bridgeP;
  const topWidth =
    lerp(state.button.w * 0.42, 42, bridgeP) *
    (1 - tearP * 0.72) *
    (1 + Math.sin(phase * 1.12) * 0.035 * bridgeP);
  const bottomWidth =
    lerp(12, dropSize * 0.55, dropP) *
    (1 - tearP * 0.84) *
    (1 + Math.cos(phase * 1.28) * 0.045 * bridgeP);

  dropShape.setAttribute(
    "d",
    dropSize > 2
      ? dropPath(
          dropX,
          dropY,
          dropSize,
          4 + state.impulse * 0.16 + Math.abs(dropSway) * 0.08,
          phase * 1.2
        )
      : ""
  );
  dropShape.style.opacity = String(clamp(dropP * 1.4 - splitP * 0.7, 0, 1));

  bridgeShape.setAttribute(
    "d",
    bridgePath(
      cx + bridgeWave + dropSway * 0.12 * bridgeP,
      buttonBottom,
      dropTop + 6,
      topWidth,
      bottomWidth,
      5 + state.impulse * 0.06 + Math.abs(dragX) * 0.018,
      phase + dragX * 0.012
    )
  );
  bridgeShape.style.opacity = String(clamp(bridgeP * 1.3 - tearP * 1.25, 0, 1));

  itemGroups.forEach((group, index) => {
    const item = items[index];
    const local = clamp((splitP - index * 0.06) / 0.82, 0, 1);
    const eased = easeOutCubic(local);
    const reaction = itemReaction(index);
    const breath = isMode(MODES.OPEN)
      ? Math.sin(phase * 0.44 + index * 1.6) * 0.018
      : 0;
    const itemCx =
      lerp(dropX, cx + item.dx, eased) +
      Math.sin(phase * 0.55 + index) * 1.2 * eased;
    const itemCy =
      lerp(dropY, cy + item.dy, eased) +
      Math.cos(phase * 0.5 + index * 0.8) * 1.1 * eased;
    const itemW = lerp(42, item.w, eased) * (1 + breath + reaction * 0.055);
    const itemH = lerp(34, item.h, eased) * (1 - breath * 0.8 + reaction * 0.045);
    const amp =
      (1 - eased) * 14 +
      Math.sin(phase + index) * 1.6 +
      Math.sin(phase * 0.7 + index * 2.1) * 0.9 * eased +
      reaction * 5.2;
    const shape = group.querySelector(".item-shape");
    const text = group.querySelector(".item-label");

    group.classList.toggle("is-reacting", reaction > 0);

    shape.setAttribute(
      "d",
      wavySuperellipse({
        cx: itemCx,
        cy: itemCy,
        w: itemW,
        h: itemH,
        amp,
        phase: phase * 1.15,
        seed: index * 1.7,
        power: 3.7,
      })
    );

    text.setAttribute("x", itemCx);
    text.setAttribute("y", itemCy + 1);
    group.style.opacity = String(eased);
  });
}

// 6. Animáció
function animateProgress({ mode, from, to, duration, easing, doneMode }) {
  if (!isMode(mode)) {
    return;
  }

  const started = performance.now();
  state.impulse = 20;

  function tick(now) {
    if (!isMode(mode)) {
      return;
    }

    const t = clamp((now - started) / duration, 0, 1);
    const eased = easing(t);

    state.progress = lerp(from, to, eased);
    state.impulse *= 0.92;
    state.motion.dropSway *= 0.94;

    render(now);

    if (t < 1) {
      state.animationFrame = requestAnimationFrame(tick);
      return;
    }

    state.progress = to;
    state.animationFrame = null;
    setMode(doneMode);
    render(performance.now());
  }

  state.animationFrame = requestAnimationFrame(tick);
}

function snapBack() {
  setMode(MODES.SNAP_BACK);
  animateProgress({
    mode: MODES.SNAP_BACK,
    from: state.progress,
    to: 0,
    duration: 260,
    easing: easeInOutCubic,
    doneMode: MODES.IDLE,
  });
}

function detachOpen() {
  setMode(MODES.DETACHING);
  animateProgress({
    mode: MODES.DETACHING,
    from: state.progress,
    to: 1,
    duration: 620,
    easing: easeOutCubic,
    doneMode: MODES.OPEN,
  });
}

function closeMenu() {
  if (!isMode(MODES.OPEN)) {
    return;
  }

  setMode(MODES.CLOSING);
  animateProgress({
    mode: MODES.CLOSING,
    from: state.progress,
    to: 0,
    duration: 440,
    easing: easeInOutCubic,
    doneMode: MODES.IDLE,
  });
}

function idle(now) {
  if (isMode(MODES.IDLE, MODES.DRAGGING, MODES.OPEN)) {
    render(now);
  }

  requestAnimationFrame(idle);
}

// 7. Eseménykezelők
function handlePointerDown(event) {
  if (!isMode(MODES.IDLE)) {
    return;
  }

  event.preventDefault();

  setMode(MODES.DRAGGING);
  state.pointer.id = event.pointerId;
  state.pointer.startX = event.clientX;
  state.pointer.startY = event.clientY;
  state.pointer.currentX = event.clientX;
  state.pointer.currentY = event.clientY;
  state.progress = 0;
  state.impulse = 10;

  hitButton.setPointerCapture(event.pointerId);
  render(performance.now());
}

function handlePointerMove(event) {
  if (!isMode(MODES.DRAGGING) || event.pointerId !== state.pointer.id) {
    return;
  }

  event.preventDefault();

  state.pointer.currentX = event.clientX;
  state.pointer.currentY = event.clientY;
  state.progress = progressFromDrag(dragDistanceFromEvent(event));
  state.impulse = 8 + state.progress * 16;
  state.motion.dropSway = clamp(pointerDragX(), -80, 80);

  render(performance.now());
}

function handlePointerUp(event) {
  if (!isMode(MODES.DRAGGING) || event.pointerId !== state.pointer.id) {
    return;
  }

  event.preventDefault();

  const distance = dragDistanceFromEvent(event);
  state.motion.dropSway = clamp(event.clientX - state.pointer.startX, -80, 80);

  if (hitButton.hasPointerCapture(event.pointerId)) {
    hitButton.releasePointerCapture(event.pointerId);
  }

  resetPointer();

  if (distance >= DRAG_OPEN_THRESHOLD) {
    detachOpen();
    return;
  }

  snapBack();
}

function handlePointerCancel(event) {
  if (!isMode(MODES.DRAGGING) || event.pointerId !== state.pointer.id) {
    return;
  }

  if (hitButton.hasPointerCapture(event.pointerId)) {
    hitButton.releasePointerCapture(event.pointerId);
  }

  resetPointer();
  snapBack();
}

function handleOverlayClick() {
  if (!isMode(MODES.OPEN)) {
    return;
  }

  closeMenu();
}

function handleKeyDown(event) {
  if (event.key !== "Escape" || !isMode(MODES.OPEN)) {
    return;
  }

  event.preventDefault();
  closeMenu();
}

function handleItemPointerEnter(event) {
  if (!isMode(MODES.OPEN)) {
    return;
  }

  state.reaction.hoverIndex = Number(event.currentTarget.dataset.index);
}

function handleItemPointerLeave(event) {
  if (!isMode(MODES.OPEN)) {
    return;
  }

  const index = Number(event.currentTarget.dataset.index);

  if (state.reaction.hoverIndex === index) {
    state.reaction.hoverIndex = null;
  }

  if (state.reaction.activeIndex === index) {
    state.reaction.activeIndex = null;
  }
}

function handleItemPointerDown(event) {
  if (!isMode(MODES.OPEN)) {
    return;
  }

  event.preventDefault();
  state.reaction.activeIndex = Number(event.currentTarget.dataset.index);
  state.impulse = 8;
}

function handleItemPointerUp(event) {
  if (!isMode(MODES.OPEN)) {
    return;
  }

  event.preventDefault();
  state.reaction.activeIndex = null;
}

function handleItemPointerCancel() {
  state.reaction.activeIndex = null;
}

hitButton.addEventListener("pointerdown", handlePointerDown);
hitButton.addEventListener("pointermove", handlePointerMove);
hitButton.addEventListener("pointerup", handlePointerUp);
hitButton.addEventListener("pointercancel", handlePointerCancel);
menuOverlay.addEventListener("click", handleOverlayClick);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("resize", resize);

itemGroups.forEach((group) => {
  group.addEventListener("pointerenter", handleItemPointerEnter);
  group.addEventListener("pointerleave", handleItemPointerLeave);
  group.addEventListener("pointerdown", handleItemPointerDown);
  group.addEventListener("pointerup", handleItemPointerUp);
  group.addEventListener("pointercancel", handleItemPointerCancel);
});

hitButton.setAttribute("aria-expanded", "false");
resize();
requestAnimationFrame(idle);
