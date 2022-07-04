/** Global point storing mouse location */
let mouse = { point: new Point(view.center), moved: false };
function onMouseMove(event) {
  mouse.point = event.point;
  mouse.moved = true;
  setTimeout(() => {
    mouse.moved = false;
  }, 1500);
}

const logger = {
  logged: {},
  log(id, ...args) {
    if (!this.logged[id]) {
      this.logged[id] = true;
      console.log(...args);
    }
  },
};

class Lizard {
  constructor(options) {
    Object.entries(options).forEach(([key, value]) => {
      this[key] = value; // todo: specify params
    });
    this.length = this.headLength + this.bodyLength + this.tailLength;
    this.spacing = 10 * this.scale; // 1/2 the distance between the points

    // Create spine
    const spine = new Path();
    const start = view.center;
    for (let i = 0; i < this.length; i++) {
      spine.add(start + new Point(i * this.spacing * 2, 0));
    }

    // Create body
    const body = new Path({ fillColor: this.primaryColor, closed: true });
    for (let i = 0; i < spine.curves.length; i++) {
      const center = spine.curves[i].getPointAt(0.5);
      const depth = this.getBodyDepth(i);
      body.insert(0, center + new Point({ angle: -90, length: depth }));
      body.add(center + new Point({ angle: 90, length: depth }));
    }
    const markings = new Path({
      fillColor: this.secondaryColor,
      closed: true,
    });
    for (let i = 0; i < spine.curves.length; i++) {
      const center = spine.curves[i].getPointAt(0.5);
      const depth = this.getBodyDepth(i);
      markings.insert(0, center + new Point({ angle: -90, length: depth }));
      markings.add(center + new Point({ angle: 90, length: depth }));
    }

    // Create feet
    const feet = new Group();
    const legSpacing = (this.headLength * 2) / this.feetPairs;
    const footCount = this.feetPairs * 2 - 1;
    for (let side of ["left", "right"]) {
      for (let i = 0; i < this.feetPairs; i++) {
        const baseIndex =
          Math.round(this.headLength + legSpacing * i * this.scale) + 1;
        const oppositeIndex = i + (this.feetPairs % footCount);
        const base = spine.segments[baseIndex];

        const foot = new Path.Circle({
          fillColor: brightness(this.primaryColor, -5),
          radius: 12 * this.scale * this.chonk,
          data: { base, side, stepping: false, index: i, oppositeIndex },
          center: this.getNextStep(base, side),
        });
        feet.addChild(foot);
      }
    }

    // Create legs
    const legs = new Group();
    feet.children.forEach((foot) => {
      const leg = new Path.Line({
        style: {
          strokeColor: brightness(this.primaryColor, -12),
          strokeWidth: 12 * this.scale * this.chonk,
          strokeCap: "round",
        },
        from: foot.data.base.point,
        to: foot.center,
      });
      leg.data = { ...foot.data };
      leg.firstCurve.divideAt(0.5);
      legs.addChild(leg);
    });

    this.body = body;
    this.markings = markings;
    this.spine = spine;
    this.legs = legs;
    this.feet = feet;
    this.group = new Group([feet, legs, spine, body, markings]);
  }

  /** Move lizard toward mouse by updating each group */
  update() {
    this.updateSpine();
    this.updateBody();
    this.updateMarkings();
    this.updateFeet();
    this.updateLegs();
  }

  /** Move spine toward mouse, progressively straightening sharp angles */
  updateSpine() {
    // Move head toward toward mouse
    const nose = this.spine.segments[0].point;
    const mouseVector = mouse.point - this.spine.firstSegment.point;
    const currentVector = nose - this.spine.segments[1].point;
    currentVector.length = 50;
    let firstVector = mouse.moved ? mouseVector : currentVector;

    if (!view.bounds.contains(firstVector + nose)) {
      // Rotate to avoid weird type error when hitting a wall head on...
      firstVector += view.center - nose.rotate(1);
    }

    if (firstVector.length > 45) {
      const distance = firstVector.length;
      const easing = mouse.moved ? Math.min(1, distance / 200) : 1;
      firstVector.length = Math.min(10, firstVector.length);
      this.spine.firstSegment.point += firstVector * easing * this.speed;
    }

    // Move each segment to be a set distance behind the previous
    let lastVector = null;
    for (let i = 0; i < this.spine.segments.length - 1; i++) {
      const segment = this.spine.segments[i];
      const nextSegment = segment.next;
      const vector = segment.point - nextSegment.point;
      vector.length = this.spacing;
      nextSegment.point = segment.point - vector;

      // Straighten out sharp bends; side-effect of length x2
      if (lastVector) {
        const adjustedVector = segment.point - nextSegment.point;
        const angle = adjustedVector.getDirectedAngle(lastVector);
        if (angle > 20 || angle < -20) {
          adjustedVector.angle = lastVector.angle;
        }
        nextSegment.point = nextSegment.point - adjustedVector;
      }
      lastVector = vector;
    }
  }

  /**
   * Returns the length from spine to body edge of a given point
   * Each section gets its own trigonometric function.
   */
  getBodyDepth(i) {
    let n;
    const neck = this.headLength;
    const waist = neck + this.bodyLength;
    if (i === 0) {
      n = 5; // nose
    } else if (i === this.length - 2) {
      n = 2; // tail-tip
    } else if (i > 0 && i < neck) {
      n = 20 * Math.sin(i / 3.14) + 5; // head
    } else if (i === neck) {
      n = 15 * Math.sin(i / 3.14) + 5; // neck
    } else if (i > neck && i < waist) {
      n = 25 * Math.sin((i - neck) / (this.bodyLength / 3.14)); // body
    } else if (i >= waist) {
      n = 10 * Math.cos((i - waist) / (this.tailLength / 1.57)); //tail
    }
    return n * this.scale * this.chonk;
  }

  /** Returns the length from spine to body edge of a given point */
  getMarkingDepth(index) {
    return Math.min(
      this.getBodyDepth(index),
      this.scale *
        this.chonk *
        8 *
        Math.sin(index - 4 / 6) *
        Math.sin((index / this.length) * 3.5)
    );
  }

  /** Draw body along the spine path */
  updateBody() {
    for (let i = 0; i < this.spine.curves.length; i++) {
      const j = this.body.segments.length - 1 - i;
      const center = this.spine.curves[i].getPointAt(0.5);
      const angle = this.spine.curves[i].getTangentAt(0.5).angle;
      this.body.segments[i].point =
        center +
        new Point({
          angle: angle + 90,
          length: this.getBodyDepth(i, this.spine.curves.length),
        });
      this.body.segments[j].point =
        center +
        new Point({
          angle: angle - 90,
          length: this.getBodyDepth(i, this.spine.curves.length),
        });
    }
    this.body.smooth({ type: "continuous" });
  }

  /** Draw body along the spine path */
  updateMarkings() {
    for (let i = 0; i < this.spine.curves.length; i++) {
      const j = this.markings.segments.length - 1 - i;
      const center = this.spine.curves[i].getPointAt(0.5);
      const angle = this.spine.curves[i].getTangentAt(0.5).angle;
      this.markings.segments[i].point =
        center +
        new Point({
          angle: angle + 90,
          length: this.getMarkingDepth(i, this.spine.curves.length),
        });
      this.markings.segments[j].point =
        center +
        new Point({
          angle: angle - 90,
          length: this.getMarkingDepth(i, this.spine.curves.length),
        });
    }
    this.markings.smooth({ type: "continuous" });
  }

  /** Returns location of the next footstep */
  getNextStep(base, side) {
    const stepAngleDelta = side === "left" ? -55 : 55;
    const angle = (base.point - base.next.point).angle + stepAngleDelta;
    return base.point + new Point({ length: this.scale * 40, angle });
  }

  /** Check each foot's distance from the next footstep and move if above threshhold */
  updateFeet() {
    this.feet.children.forEach((foot) => {
      const { base, side, oppositeIndex } = foot.data;
      const step = this.getNextStep(base, side);
      const stepVector = step - foot.position;

      const priorFoot = foot.previousSibling;
      const oppositeFoot = this.feet.children[oppositeIndex];
      const canStep = !priorFoot?.data.stepping && !oppositeFoot.data.stepping;

      if (stepVector.length > 85 && canStep) {
        foot.data.stepping = true;
      }

      if (foot.data.stepping) {
        stepVector.length = Math.min(30 * this.speed, stepVector.length);
        foot.position += stepVector;
        foot.data.stepping = (step - foot.position).length != 0;
      }
    });
  }

  /** Reposition each leg betwwen its base and foot */
  updateLegs() {
    for (let i = 0; i < this.legs.children.length; i++) {
      const leg = this.legs.children[i];
      const foot = this.feet.children[i];
      const [hip, knee, ankle] = leg.segments;
      const { base } = foot.data;
      hip.point = base.point;
      ankle.point = foot.position;
      knee.point = (ankle.point + hip.point) / 2;
      let angle = leg.data.base.curve.getTangentAt(0.5).angle;
      knee.point += new Point({ length: 20, angle });
      leg.smooth({ type: "continuous", factor: 0.25 });
    }
  }
}

const lizards = [];

// Add functions to window so that they can be called externally
window.spawnLizard = function (props) {
  lizards.forEach((l) => l.group.remove());
  lizards.push(new Lizard(props));
};

function onFrame(event) {
  lizards.forEach((lizard) => lizard.update());
}

function brightness(color, percent) {
  const num = parseInt(color.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    B = ((num >> 8) & 0x00ff) + amt,
    G = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
      (G < 255 ? (G < 1 ? 0 : G) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
