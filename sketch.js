let handpose;
let video;
let hands = [];
let isDetecting = false;
let drawing;
let offScreenDrawing;
let healthBarEl;
let spellFxEl;
let startBattleBtnEl;
let opponentStageEl;
let spellAnimTimeoutId;
let confidence;
let prevX = 0;
let prevY = 0;
let isCastingSpell = false;
let hasDrawnOnCanvas = false;
let battleActive = false;
let opponentHealth = 100;
const MAX_HEALTH = 100;
const VIDEO_CANVAS_WIDTH = 640;
const VIDEO_CANVAS_HEIGHT = 480;
const PINCH_DISTANCE = 30;
const PALM_DISTANCE = 200;
const SPELL_DAMAGE = {
  fireball: 30,
  icefall: 15,
  poisongas: 10,
};
const SPELL_ANIM_DURATION_MS = {
  "hit-fireball": 1250,
  "hit-icefall": 1700,
  "hit-poisongas": 3200,
};
// Image comparing model
const IMAGE_MODEL_URL = "https://teachablemachine.withgoogle.com/models/UW3LaSUjo/"
let label;

// Call this function to start and stop detection
function toggleDetection() {
  setDetection(!isDetecting);
}

function setDetection(enabled) {
  if (enabled === isDetecting) {
    return;
  }

  if (!enabled) {
    handPose.detectStop();
    isDetecting = false;
    prevX = 0;
    prevY = 0;
    return;
  }

  handPose.detectStart(video, gotHands);
  isDetecting = true;
}

function preload() {
  handPose = ml5.handPose({
    maxHands: 1,
  });
  spellClassifier = ml5.imageClassifier(IMAGE_MODEL_URL + "model.json", {
    flipped: true,
  });
}

function setup() {
  createCanvas(VIDEO_CANVAS_WIDTH, VIDEO_CANVAS_HEIGHT);

  // Create drawing layer and offscreen canvas for comparing
  drawing = createGraphics(VIDEO_CANVAS_WIDTH, VIDEO_CANVAS_HEIGHT);
  drawing.clear();
  offScreenDrawing = createGraphics(VIDEO_CANVAS_WIDTH, VIDEO_CANVAS_HEIGHT);
  offScreenDrawing.background(255);

  // Create the video and hide it
  video = createCapture(VIDEO, {flipped: true});
  video.size(VIDEO_CANVAS_WIDTH, VIDEO_CANVAS_HEIGHT);
  video.hide();

  healthBarEl = document.getElementById("healthbar");
  spellFxEl = document.getElementById("spell-fx");
  startBattleBtnEl = document.getElementById("start-battle-btn");
  opponentStageEl = document.getElementById("opponent-stage");

  if (startBattleBtnEl) {
    startBattleBtnEl.addEventListener("click", startNewFight);
  }

  updateHealthBar();
  setBattleUI(false);
}

// Callback function for when handPose outputs data
function gotHands(results) {
  // Save the output to the hands variable
  hands = results;
}

// A function to run when we get the results and any errors
function gotResult(results) {
  // Update the label variable which is displayed on the canvas
  confidence = nf(results[0].confidence, 0, 2);
  if (confidence > 0.5) {
    label = results[0].label;
    label = label.toLowerCase().replace(/\s+/g, "");
    const wasDefeated = applySpellDamage(label);
    triggerSpellAnimation(label);

    if (wasDefeated) {
      const className = "hit-" + label;
      const duration = SPELL_ANIM_DURATION_MS[className] || 1200;
      setTimeout(() => {
        if (battleActive && opponentHealth === 0) {
          handleOpponentDefeated();
        }
      }, duration);
    }
  } else {
    label = "error";
  }
}

async function castSpell() {
  isCastingSpell = true;
  setDetection(false);

  try {
    const results = await spellClassifier.classify(offScreenDrawing);
    gotResult(results);
  } finally {
    drawing.clear();
    offScreenDrawing.clear();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    offScreenDrawing.background(255);
    prevX = 0;
    prevY = 0;
    isCastingSpell = false;
    hasDrawnOnCanvas = false;
    if (battleActive && opponentHealth > 0) {
      setDetection(true);
    }
  }
} 

function applySpellDamage(spellName) {
  const damage = SPELL_DAMAGE[spellName] ?? 0;
  opponentHealth = max(0, opponentHealth - damage);
  updateHealthBar();

  return opponentHealth === 0;
}

function setBattleUI(isInBattle) {
  if (startBattleBtnEl) {
    startBattleBtnEl.classList.toggle("hidden", isInBattle);
  }

  if (opponentStageEl) {
    opponentStageEl.classList.toggle("hidden", !isInBattle);
  }
}

function startNewFight() {
  if (battleActive) {
    return;
  }

  battleActive = true;
  opponentHealth = MAX_HEALTH;
  healthBarEl.classList.remove("hidden");
  label = "";
  confidence = 0;
  isCastingSpell = false;
  hasDrawnOnCanvas = false;
  hands = [];
  drawing.clear();
  offScreenDrawing.clear();
  offScreenDrawing.background(255);
  updateHealthBar();
  setBattleUI(true);
  setDetection(true);
}

function handleOpponentDefeated() {
  battleActive = false;
  isCastingSpell = false;
  setDetection(false);
  setBattleUI(false);
}

function updateHealthBar() {
  if (!healthBarEl) {
    return;
  }

  const percent = constrain((opponentHealth / MAX_HEALTH) * 100, 0, 100);
  healthBarEl.style.width = percent + "%";
}

function triggerSpellAnimation(spellName) {
  if (!spellFxEl) {
    return;
  }

  const knownClasses = ["hit-fireball", "hit-icefall", "hit-poisongas"];
  const className = "hit-" + spellName;

  for (const knownClass of knownClasses) {
    spellFxEl.classList.remove(knownClass);
  }

  // Force reflow so re-casting the same spell retriggers the animation.
  void spellFxEl.offsetWidth;

  if (knownClasses.includes(className)) {
    spellFxEl.classList.add(className);

    if (spellAnimTimeoutId) {
      clearTimeout(spellAnimTimeoutId);
    }

    spellAnimTimeoutId = setTimeout(() => {
      spellFxEl.classList.remove(className);
      spellAnimTimeoutId = null;
    }, SPELL_ANIM_DURATION_MS[className] || 1200);
  }
}

// Finally, draw video and hand points to the canvas
function draw() {
  // Draw video
  image(video, 0, 0, width, height);
  frameRate(24);
  
  // Find all the necessary hand points of first hand if isDetecting
  if (isDetecting) {
    if (hands.length > 0) {
      let hand = hands[0];
      let wrist = hand.wrist;
      let thumb = hand.thumb_tip;
      let index = hand.index_finger_tip;
      let middle = hand.middle_finger_tip;
      let ring = hand.ring_finger_tip;
      let pinky = hand.pinky_tip;

      // If distance between fingers and wrist are greater than threshold, send drawing
      let wristThumbDist = dist(wrist.x, wrist.y, middle.x, middle.y)
      let wristIndexDist = dist(wrist.x, wrist.y, middle.x, middle.y)
      let wristMidDist = dist(wrist.x, wrist.y, middle.x, middle.y)
      let wristRingDist = dist(wrist.x, wrist.y, middle.x, middle.y)
      let wristPinkyDist = dist(wrist.x, wrist.y, middle.x, middle.y)
      let wristDist = ( wristThumbDist + wristIndexDist + wristMidDist + wristRingDist + wristPinkyDist) * 0.2

      // If distance between pinch fingers is less than threshold, then start drawing
      let pinchX = (index.x + thumb.x) * 0.5;
      let pinchY = (index.y + thumb.y) * 0.5;
      let pinchDist = dist(index.x, index.y, thumb.x, thumb.y)
      if (pinchDist < PINCH_DISTANCE) {
        drawing.stroke(255, 255, 255);
        offScreenDrawing.stroke(0, 0, 0);
        offScreenDrawing.strokeWeight(8);
        drawing.strokeWeight(8);
        if (prevX === 0) {
          prevX = pinchX
        }
        if (prevY === 0) {
          prevY = pinchY
        }
        drawing.line(prevX, prevY, pinchX, pinchY);
        offScreenDrawing.line(prevX, prevY, pinchX, pinchY);
        prevX = pinchX;
        prevY = pinchY;
        hasDrawnOnCanvas = true;
      } else if (!isCastingSpell && hasDrawnOnCanvas && wristDist > PALM_DISTANCE) {
        prevX = 0;
        prevY = 0;
        castSpell()
      } else {
        // Break stroke continuity whenever pinch is released.
        prevX = 0;
        prevY = 0;
      }
    } else {
      prevX = 0;
      prevY = 0;
    }
  }
  image(drawing, 0, 0);
  fill(255);
  textSize(16);
  textAlign(CENTER);
  text(label, width / 2, height - 4);
}
