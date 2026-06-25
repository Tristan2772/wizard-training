let handpose;
let video;
let hands = [];
let isDetecting = false;
let drawing;
let prevX = 0;
let prevY = 0;
const VIDEO_CANVAS_WIDTH = 640;
const VIDEO_CANVAS_HEIGHT = 480;
const PINCH_DISTANCE = 30;
const PALM_DISTANCE = 150;

// Toggle detection when mouse is pressed
function mousePressed() {
  toggleDetection();
}

// Call this function to start and stop detection
function toggleDetection() {
  if (isDetecting) {
    handPose.detectStop();
    isDetecting = false;
    prevX = 0;
    prevY = 0;
  } else {
    handPose.detectStart(video, gotHands);
    isDetecting = true;
  }
}

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(VIDEO_CANVAS_WIDTH, VIDEO_CANVAS_HEIGHT);

  // Create drawing layer
  drawing = createGraphics(VIDEO_CANVAS_WIDTH, VIDEO_CANVAS_HEIGHT);
  drawing.clear();

  // Create the video and hide it
  video = createCapture(VIDEO, {flipped: true});
  video.size(VIDEO_CANVAS_WIDTH, VIDEO_CANVAS_HEIGHT);
  video.hide();
}

// Callback function for when handPose outputs data
function gotHands(results) {
  // Save the output to the hands variable
  hands = results;
}

// Finally, draw video and hand points to the canvas
function draw() {
  // Draw video
  image(video, 0, 0, width, height);
  
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
        drawing.stroke(255, 0, 255);
        drawing.strokeWeight(8)
        if (prevX === 0) {
          prevX = pinchX
        }
        if (prevY === 0) {
          prevY = pinchY
        }
        drawing.line(prevX, prevY, pinchX, pinchY);
      } else {
        if (wristDist > PALM_DISTANCE) {
          console.log(drawing)
        }
      }
      prevX = pinchX;
      prevY = pinchY;
    }
  }
  image(drawing, 0, 0);
}

