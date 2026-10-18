// Draws the name wheel and works out where it is at any moment of a spin.
const COLORS = [
  { bg: "#B3202A", fg: "#FFFFFF" }, // red
  { bg: "#C9B78F", fg: "#1A1A1A" }, // khaki
  { bg: "#6B4423", fg: "#FFFFFF" }, // brown
  { bg: "#FFFFFF", fg: "#1A1A1A" }, // white
  { bg: "#1A1A1A", fg: "#FFFFFF" }, // black
];
const TAU = Math.PI * 2;

export class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.face = document.createElement("canvas");
    this.names = null;
    this.rotation = 0;
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const size = Math.round(this.canvas.clientWidth * dpr);
    if (!size || size === this.canvas.width) return;
    this.canvas.width = this.canvas.height = size;
    this.face.width = this.face.height = size;
    this.paintFace();
    this.draw(this.rotation);
  }

  setNames(names) {
    if (this.names && names.length === this.names.length && names.every((n, i) => n === this.names[i])) return;
    this.names = names.slice();
    this.paintFace();
    this.draw(this.rotation);
  }

  paintFace() {
    const s = this.face.width;
    if (!s || !this.names) return;
    const c = this.face.getContext("2d");
    const r = s / 2;
    const n = this.names.length;
    c.clearRect(0, 0, s, s);
    c.save();
    c.translate(r, r);

    if (n === 0) {
      c.fillStyle = "#EFE8DA";
      c.beginPath(); c.arc(0, 0, r * 0.97, 0, TAU); c.fill();
      c.fillStyle = "#6B4423";
      c.font = `600 ${Math.round(r * 0.09)}px system-ui, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("Names appear here", 0, 0);
      c.restore();
      return;
    }

    const seg = TAU / n;
    c.rotate(-Math.PI / 2); // angle 0 points up at the pointer
    for (let i = 0; i < n; i++) {
      let col = COLORS[i % COLORS.length];
      if (i === n - 1 && n > 1 && i % COLORS.length === 0) col = COLORS[2]; // avoid same colour meeting at the seam
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, r * 0.97, i * seg, (i + 1) * seg);
      c.closePath();
      c.fillStyle = col.bg;
      c.fill();
      c.strokeStyle = "rgba(0,0,0,0.18)";
      c.lineWidth = Math.max(1, s / 600);
      c.stroke();

      c.save();
      c.rotate((i + 0.5) * seg);
      const fontPx = Math.max(7, Math.min(r * 0.075, r * seg * 0.5));
      c.font = `600 ${fontPx}px system-ui, sans-serif`;
      c.fillStyle = col.fg;
      c.textAlign = "right";
      c.textBaseline = "middle";
      const label = this.names[i].length > 18 ? this.names[i].slice(0, 17) + "…" : this.names[i];
      c.fillText(label, r * 0.9, 0, r * 0.68);
      c.restore();
    }
    // rim
    c.beginPath(); c.arc(0, 0, r * 0.97, 0, TAU);
    c.lineWidth = r * 0.03; c.strokeStyle = "#1A1A1A"; c.stroke();
    c.restore();
  }

  draw(rotation) {
    this.rotation = rotation;
    const s = this.canvas.width;
    if (!s) return;
    const c = this.ctx;
    c.clearRect(0, 0, s, s);
    c.save();
    c.translate(s / 2, s / 2);
    c.rotate(rotation);
    c.drawImage(this.face, -s / 2, -s / 2);
    c.restore();
    if (this.names?.length) this.paintHub(s / 2);
  }

  // Hub stays upright while the wheel turns.
  paintHub(r) {
    const c = this.ctx;
    c.save();
    c.translate(r, r);
    c.beginPath(); c.arc(0, 0, r * 0.12, 0, TAU);
    c.fillStyle = "#FFFFFF"; c.fill();
    c.lineWidth = r * 0.025; c.strokeStyle = "#B3202A"; c.stroke();
    c.fillStyle = "#B3202A";
    c.font = `800 ${Math.round(r * 0.13)}px Georgia, serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("?", 0, r * 0.01);
    c.restore();
  }

  // Index of the name currently under the pointer.
  indexAt(rotation) {
    const n = this.names?.length || 0;
    if (!n) return -1;
    const a = ((-rotation % TAU) + TAU) % TAU;
    return Math.floor(a / (TAU / n)) % n;
  }
}

// Final rotation that lands the pointer on the winner. Every phone computes the
// same value from the shared draw record, so they all stop on the same name.
export function finalRotation(draw) {
  const n = draw.names.length;
  const seg = TAU / n;
  const target = (draw.winner + 0.5 + draw.jitter) * seg;
  return draw.turns * TAU + (TAU - target);
}

export function spinProgress(draw, now) {
  const p = Math.min(1, Math.max(0, (now - draw.startAt) / draw.duration));
  return 1 - Math.pow(1 - p, 4); // fast start, long slow finish
}
