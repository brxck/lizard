"use strict";

const POINTS = 15; // The amount of points in the spine
const SPACING = 10; // 1/2 the distance between the points

let mouse = new Point(view.center);

const spine = new Path({
  strokeColor: "green",
  strokeWidth: 20,
  strokeCap: "round",
});
const start = view.center / [10, 1];
for (let i = 0; i < POINTS; i++) {
  spine.add(start + new Point(i * SPACING, 0));
}

const footParams = {
  center: spine.segments[2].point,
  strokeColor: "green",
  strokeWidth: 20,
  radius: 5,
};
const feet = [];
for (let i = 0; i < 4; i++) {
  feet[i] = new Path.Circle(footParams);
}
const lizard = new Group([spine]);

function onFrame(event) {
  console.clear();

  // Move head toward toward mouse
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

  const shoulders = spine.segments[3];
  const shoulderAngle = (shoulders.point - shoulders.next.point).angle;
  const rightForestep =
    shoulders.point + new Point({ length: 75, angle: shoulderAngle + 35 });
  const rightForestepDelta = rightForestep.getDistance(feet[0].position);
  const leftForestep =
    shoulders.point + new Point({ length: 75, angle: shoulderAngle - 35 });
  const leftForestepDelta = leftForestep.getDistance(feet[1].position);
  const hips = spine.segments[10];
  const hipAngle = (hips.point - hips.next.point).angle;
  const rightHindstep =
    hips.point + new Point({ length: 75, angle: hipAngle + 35 });
  const rightHindstepDelta = rightHindstep.getDistance(feet[2].position);
  const leftHindstep =
    hips.point + new Point({ length: 75, angle: hipAngle - 35 });
  const leftHindstepDelta = leftHindstep.getDistance(feet[3].position);
  console.log(rightForestepDelta);
  if (rightForestepDelta > 100) {
    feet[0].position = rightForestep;
  }
  if (leftForestepDelta > 100) {
    feet[1].position = leftForestep;
  }
  if (rightHindstepDelta > 100) {
    feet[2].position = rightHindstep;
  }
  if (leftHindstepDelta > 100) {
    feet[3].position = leftHindstep;
  }

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
