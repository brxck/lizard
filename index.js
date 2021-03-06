"use strict";

const SPACING = 10; // 1/2 the distance between the points

function spawnLizard({
  length = 15,
  style,
  feetPairs = 4,
  headSize = 2,
  tailSize = 3,
}) {
  const spine = new Path({
    ...style,
    name: "spine",
  });
  const start = view.center / [10, 1];
  for (let i = 0; i < length; i++) {
    spine.add(start + new Point(i * SPACING, 0));
  }
  const feet = new Group({ name: "feet" });
  const footParams = {
    ...style,
    center: spine.segments[2].point,
    radius: 5,
  };
  const legSpacing = (length - headSize - tailSize) / feetPairs;
  for (let i = 0; i < feetPairs; i++) {
    const baseIndex = Math.round(headSize + legSpacing * i);
    console.log(baseIndex);
    const base = spine.segments[baseIndex];
    const foot = new Path.Circle({ ...footParams, data: { base } });
    foot.data.side = "left";
    feet.addChild(foot.clone());
    foot.data.side = "right";
    feet.addChild(foot);
  }
  const lizard = new Group([spine, feet]);
  return lizard;
}

let mouse = new Point(view.center);

const lizards = [
  {
    style: { strokeColor: "green", strokeWidth: 20, strokeCap: "round" },
    feetPairs: 2,
  },
].map((props) => spawnLizard(props));

function onFrame(event) {
  // console.clear();
  lizards.forEach((lizard) => {
    const { spine, feet: footGroup } = lizard.children;
    const feet = footGroup.children;

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

    feet.forEach((foot) => {
      const { base, side } = foot.data;
      const stepAngleDelta = side === "left" ? -35 : 35;
      const angle = (base.point - base.next.point).angle + stepAngleDelta;
      const step = base.point + new Point({ length: 75, angle });
      const stepDelta = step.getDistance(foot.position);
      if (stepDelta > 100) {
        foot.position = step;
      }
    });

    spine.smooth({ type: "continuous" });
  });
}

function onMouseMove(event) {
  mouse = event.point;
}
