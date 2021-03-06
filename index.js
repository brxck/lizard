"use strict";

const POINTS = 8; // The amount of points in the spine
const SPACING = 10; // 1/2 the distance between the points

let mouse = new Point(view.center);

const spine = new Path({
  strokeColor: "green",
  strokeWidth: 20,
  strokeCap: "round",
});

const lizard = new Group([spine]);

const start = view.center / [10, 1];
for (let i = 0; i < POINTS; i++) {
  spine.add(start + new Point(i * SPACING, 0));
}

function onFrame(event) {
  console.clear();

  const firstVector = mouse - spine.firstSegment.point;
  firstVector.length = Math.min(20, firstVector.length);
  spine.firstSegment.point += firstVector;

  let lastVector = null;
  spine.segments.forEach((segment) => {
    const nextSegment = segment.next;
    if (!nextSegment) return;
    const vector = segment.point - nextSegment.point;
    vector.length = SPACING;
    nextSegment.point = segment.point - vector;

    // Don't allow sharp bends; side-effect of length x2
    if (lastVector) {
      const adjustedVector = segment.point - nextSegment.point;
      const angle = adjustedVector.getDirectedAngle(lastVector);
      // The finer the angle the smoother the action
      // Fine:fish / Coarse:lizard
      if (angle > 30) {
        adjustedVector.angle = lastVector.angle;
        adjustedVector.rotate(50);
      } else if (angle < -30) {
        adjustedVector.angle = lastVector.angle;
        adjustedVector.rotate(-50);
      }
      nextSegment.point = nextSegment.point - adjustedVector;
    }
    lastVector = vector;
  });

  spine.smooth({ type: "continuous" });
}

function onMouseMove(event) {
  mouse = event.point;
}

function onMouseDown(event) {
  spine.fullySelected = true;
}

function onMouseUp(event) {
  spine.fullySelected = false;
}
