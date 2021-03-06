"use strict";

const SPACING = 10; // 1/2 the distance between the points

/** Global point storing mouse location */
let mouse = new Point(view.center);
function onMouseMove(event) {
  mouse = event.point;
}

function spawnLizard({
  defaultStyle,
  legStyle = {},
  footStyle = {},
  spineStyle = {},
  feetPairs = 4,
  headSize = 5,
  tailSize = 3,
  midSize = 10,
}) {
  const length = headSize + tailSize + midSize;
  const spine = new Path({
    ...defaultStyle,
    ...spineStyle,
    name: "spine",
  });
  const start = view.center / [10, 1];
  for (let i = 0; i < length; i++) {
    spine.add(start + new Point(i * SPACING, 0));
  }

  const feet = new Group({ name: "feet" });
  const legs = new Group({ name: "legs" });
  const legSpacing = midSize / feetPairs;
  for (let i = 0; i < feetPairs; i++) {
    const baseIndex = Math.round(headSize + legSpacing * i);
    const base = spine.segments[baseIndex];
    const rightFoot = new Path.Circle({
      ...defaultStyle,
      ...footStyle,
      radius: 5,
      data: { base, side: "right", stepping: true },
      center: getStep(base, "right"),
    });
    leftFoot = rightFoot.clone();
    leftFoot.center = getStep(base, "left");
    leftFoot.data.side = "left";
    leftFoot.data.opposite = rightFoot;
    rightFoot.data.opposite = leftFoot;
    feet.addChildren([leftFoot, rightFoot]);
  }

  feet.children.forEach((foot) => {
    const leg = new Path.Line({
      ...defaultStyle,
      ...legStyle,
      from: foot.data.base.point,
      to: foot.center,
    });
    // leg.length *= 2;
    leg.firstCurve.divideAt(0.5);
    legs.addChild(leg);
  });
  const lizard = new Group([feet, legs, spine]);
  return lizard;
}

const lizards = [
  {
    defaultStyle: {
      strokeColor: "#18ba49",
      strokeWidth: 20,
      strokeCap: "round",
    },
    legStyle: { strokeColor: "#14993c", strokeWidth: 12 },
    footStyle: { strokeColor: "#11ab3f", strokeWidth: 14 },
    feetPairs: 2,
  },
].map((props) => spawnLizard(props));

function onFrame(event) {
  console.clear();
  lizards.forEach((lizard) => {
    const { spine, feet, legs } = lizard.children;
    moveSpine(lizard);
    moveFeet(feet);
    moveLegs(legs, feet);
    spine.smooth({ type: "continuous" });
    legs.children.forEach((leg) => leg.smooth({ type: "continuous" }));
  });
}

function moveSpine(lizard) {
  // Move head toward toward mouse
  const { spine } = lizard.children;
  const firstVector = mouse - spine.firstSegment.point;
  firstVector.length = Math.min(10, firstVector.length);
  spine.firstSegment.point += firstVector;

  // Move each segment to be a set distance behind the previous
  let lastVector = null;
  spine.segments.forEach((segment, i) => {
    const nextSegment = segment.next;
    if (!nextSegment) return;
    const vector = segment.point - nextSegment.point;
    vector.length = SPACING;
    nextSegment.point = segment.point - vector;

    // Straighten out sharp bends; side-effect of length x2
    if (lastVector) {
      const adjustedVector = segment.point - nextSegment.point;
      const angle = adjustedVector.getDirectedAngle(lastVector);
      if (angle > 20) {
        adjustedVector.angle = lastVector.angle;
      } else if (angle < -20) {
        adjustedVector.angle = lastVector.angle;
      }
      nextSegment.point = nextSegment.point - adjustedVector;
    }
    lastVector = vector;
  });
}

function getStep(base, side) {
  const stepAngleDelta = side === "left" ? -45 : 45;
  const angle = (base.point - base.next.point).angle + stepAngleDelta;
  return base.point + new Point({ length: 30, angle });
}

function moveFeet(feet) {
  feet.children.forEach((foot) => {
    const { base, side, opposite } = foot.data;
    const step = getStep(base, side);
    const stepVector = step - foot.position;
    if (stepVector.length > 85 && !opposite.data.stepping) {
      foot.data.stepping = true;
    }
    if (foot.data.stepping) {
      stepVector.length = Math.min(30, stepVector.length);
      foot.position += stepVector;
      foot.data.stepping = (step - foot.position).length != 0;
    }
  });
}

function moveLegs(legs, feet) {
  zip(legs.children, feet.children).forEach(([leg, foot], i) => {
    const [hip, knee, ankle] = leg.segments;
    const { base } = foot.data;
    hip.point = base.point;
    ankle.point = foot.position;
    knee.point = (ankle.point + hip.point) / 2;

    // Genuinely no idea what I'm doing here, began as an attempt at inverse kinematics...
    // Winged it at the end. Basically, angle the knees.
    const toDeg = 180 / Math.PI;
    const segmentLength = 100;
    const distance = hip.point.getDistance(foot.position);
    const cosAngle =
      (segmentLength * segmentLength +
        segmentLength * segmentLength -
        distance * distance) /
      (2 * segmentLength * segmentLength);
    const acosAngle = Math.acos(cosAngle) * toDeg;
    const angle = (base.point - base.next.point).angle - (180 - acosAngle);
    knee.point += new Point({ length: 15, angle });
  });
}

function zip(a, b) {
  return a.map((k, i) => [k, b[i]]);
}

function onMouseDown() {
  lizards[0].fullySelected = true;
}

function onMouseUp() {
  lizards[0].fullySelected = false;
}
