const SPACING = 10; // 1/2 the distance between the points

/** Global point storing mouse location */
let mouse = new Point(view.center);
function onMouseMove(event) {
  mouse = event.point;
}

class Lizard {
  constructor({
    primaryColor,
    secondaryColor,
    feetPairs = 2,
    lengths = {
      head: 6,
      tail: 8,
      body: 10,
    },
  }) {
    this.length = lengths.head + lengths.tail + lengths.body;

    // Create spine
    const spine = new Path();
    const start = view.center;
    for (let i = 0; i < this.length; i++) {
      spine.add(start + new Point(i * SPACING * 2, 0));
    }

    // Create body
    const body = new Path({ fillColor: "#18ba49", closed: true });
    for (let i = 0; i < spine.curves.length; i++) {
      const center = spine.curves[i].getPointAt(0.5);
      const depth = this.getBodyDepth(i);
      body.insert(0, center + new Point({ angle: -90, length: depth }));
      body.add(center + new Point({ angle: 90, length: depth }));
    }
    const markings = new Path({
      fillColor: secondaryColor,
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
    const legSpacing = (lengths.body / feetPairs) * 0.8;
    for (let i = 0; i < feetPairs; i++) {
      const baseIndex = Math.round(lengths.head + legSpacing * i);
      const base = spine.segments[baseIndex];
      const rightFoot = new Path.Circle({
        fillColor: brightness(primaryColor, -10),
        radius: 12,
        data: { base, side: "right", stepping: true },
        center: this.getNextStep(base, "right"),
      });
      const leftFoot = rightFoot.clone();
      leftFoot.center = this.getNextStep(base, "left");
      leftFoot.data.side = "left";
      leftFoot.data.opposite = rightFoot;
      rightFoot.data.opposite = leftFoot;
      feet.addChildren([leftFoot, rightFoot]);
    }

    // Create legs
    const legs = new Group();
    feet.children.forEach((foot) => {
      const leg = new Path.Line({
        style: {
          strokeColor: brightness(primaryColor, -20),
          strokeWidth: 12,
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
    const firstVector = mouse - this.spine.firstSegment.point;
    if (firstVector.length > 45) {
      firstVector.length = Math.min(10, firstVector.length);
      this.spine.firstSegment.point += firstVector;
    }

    // Move each segment to be a set distance behind the previous
    let lastVector = null;
    for (let i = 0; i < this.spine.segments.length - 1; i++) {
      const segment = this.spine.segments[i];
      const nextSegment = segment.next;
      const vector = segment.point - nextSegment.point;
      vector.length = SPACING;
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
    this.spine.smooth({ type: "continuous" });
  }

  /** Returns the length from spine to body edge of a given point */
  getBodyDepth(index) {
    if (index === 0) return 5; // nose
    if (index === this.length - 2) return 1.5; // tail-tip
    if (index > 0 && index < 4) return 30 * Math.sin(index / 4) + 5; // head
    if (index >= 5 && index < 12) return 25 * Math.sin((index - 3) / 4); // body
    if (index >= 12) return 13 * Math.cos((index - 12) / 6) + 2; //tail
    return 15 * Math.cos(index / this.length); // neck
  }

  /** Returns the length from spine to body edge of a given point */
  getMarkingDepth(index) {
    return 10 * Math.sin(index - 4 / 6) * Math.sin((index / this.length) * 3.5);
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
    return base.point + new Point({ length: 40, angle });
  }

  /** Check each foot's distance from the next footstep and move if above threshhold */
  updateFeet() {
    this.feet.children.forEach((foot) => {
      const { base, side, opposite } = foot.data;
      const step = this.getNextStep(base, side);
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
      leg.smooth({ type: "continuous" });
    }
  }
}

const lizards = [
  {
    primaryColor: "#18ba49",
    secondaryColor: "#b83a2e",
    feetPairs: 2,
  },
].map((props) => new Lizard(props));

function onFrame(event) {
  console.clear();
  lizards.forEach((lizard) => lizard.update());
}

function onMouseDown() {
  lizards[0].group.fullySelected = true;
}

function onMouseUp() {
  lizards[0].group.fullySelected = false;
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
