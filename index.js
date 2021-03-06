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
    });
    leftFoot = rightFoot.clone();
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
    legStyle: { strokeColor: "#14993c" },
    footStyle: { strokeColor: "#11ab3f" },
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

    // Don't allow sharp bends; side-effect of length x2
    if (lastVector) {
      const adjustedVector = segment.point - nextSegment.point;
      const angle = adjustedVector.getDirectedAngle(lastVector);
      if (angle > 20) {
        adjustedVector.angle = lastVector.angle;
        adjustedVector.rotate(20);
      } else if (angle < -20) {
        adjustedVector.angle = lastVector.angle;
        adjustedVector.rotate(20);
      }
      nextSegment.point = nextSegment.point - adjustedVector;
    }
    lastVector = vector;
  });
}

function moveFeet(feet) {
  feet.children.forEach((foot) => {
    const { base, side, opposite } = foot.data;
    const stepAngleDelta = side === "left" ? -35 : 35;
    const angle = (base.point - base.next.point).angle + stepAngleDelta;
    const step = base.point + new Point({ length: 50, angle });
    const stepVector = step - foot.position;
    if (stepVector.length > 100 && !opposite.data.stepping) {
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
  zip(legs.children, feet.children).forEach(([leg, foot]) => {
    leg.segments[0].point = foot.data.base.point;
    leg.segments[1].point = foot.position;
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
